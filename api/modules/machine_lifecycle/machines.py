from __future__ import annotations

import logging
import libvirt
import asyncio
import copy

from typing import Optional, List, Any
from uuid import UUID, uuid4
from bisect import insort
from contextlib import AsyncExitStack
from psycopg import AsyncConnection
from psycopg_pool import AsyncConnectionPool

from config.env_config import ENV_CONFIG
from modules.libvirt_socket import LibvirtConnection
from modules.machine_lifecycle.remote_access import update_machine_clients
from modules.machine_lifecycle.models import MachineParameters, CreateMachineForm, MachineBulkSpec, ConnectionPermissions, ModifyMachineForm, InternetInterface
from modules.machine_lifecycle.xml_translator import create_machine_xml, parse_machine_xml, translate_machine_form_to_machine_parameters
from modules.machine_lifecycle.disks import delete_machine_disk, machine_disks_cleanup, create_machine_disk
from modules.machine_lifecycle.networks import get_network_bridge_ip, attach_internet_interface, detach_internet_interface
from modules.machine_state.queries import get_machine_owner_uuid
from modules.postgresql.main import async_pool
from modules.postgresql.simple_select import select_single_field
from utils.mac import generate_random_mac

logger = logging.getLogger(__name__)

################################
#          Helpers
################################
class NameCounter:
    
    def __init__(self, async_connection_pool: AsyncConnectionPool[Any], owner_uuid: UUID, machine_name: str):
        self.async_connection_pool = async_connection_pool
        self.owner_uuid = owner_uuid
        self.machine_name = machine_name
        
        self.free_ids: list[int] = []
        self.current_max: int = 0
        
        self._exit_stack: AsyncExitStack | None = None
        self._connection: AsyncConnection | None = None
        

    async def __aenter__(self) -> NameCounter:
        # Registers all opened context managers. When stack is closed it performs cleanup callbacks and closes them freeing the resources.
        # This variable is an integral part of every async context manager.
        self._exit_stack = AsyncExitStack()
        
        # This part adds async psycopg connection from the pool to the AsyncExitStack starting a transaction. This way correct cleanup is ensured. 
        self._connection = await self._exit_stack.enter_async_context(self.async_connection_pool.connection())

        # In order to block concurrent operations on the same (owner_uuid, name) combination in machine_name_counters table, a PostgreSQL advisory lock is acquired.
        await self._acquire_lock()

        # Only after locking given (owner_uuid, name) combination queries can be performed to retireve current state or create a new record
        await self._load_state()
        
        # After the initial setup, instance of the context manager is returned to be used
        return self
    
    
    async def __aexit__(self, exc_type, exc, tb) -> bool:
        # Check whether any excpetion occured during the execution of the code inside the context manager. If not, save the state to the database.
        try:
            if exc_type is None:
                await self._save_state()
        # This is a standard cleanup procedure in async context managers.
        # _exit_stack contains all open references to this context manager and open connections to the db taken from the pool
        # aclose() ensures that they are dereferenced and closed correctly - this is called reagardless of any error that might have occured during the performed operations
        finally:
            if self._exit_stack is not None:
                await self._exit_stack.aclose()
                self._exit_stack = None
                self._connection = None
                
        return False
    
    def _lock_key(self) -> str:
            return f"{self.owner_uuid}:{self.machine_name}"
        
    async def _acquire_lock(self) -> None:
        if self._connection is not None:
            await self._connection.execute("SELECT pg_advisory_xact_lock(hashtextexntended(%s, 0))")
        else:
            raise Exception(f"Connection to the Database is not open. Cannot acquire resource lock for {self.owner_uuid}:{self.machine_name}.")
    
    
    async def _load_state(self) -> None:
        if self._connection is not None:
            # Try to insert new record - if it already exists the ignore the conflict. 
            # This is actually faster than querying a record with SELECT and checking if it actually exists and only then performing INSERT operation.
            await self._connection.execute(
                """
                INSERT INTO machine_name_counters (owner_uuid, name, free_ids, current_max) 
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (owner_uuid, name) DO NOTHING
                """, 
                (self.owner_uuid, self.machine_name, [], 0)
            )
        
            cursor = await self._connection.execute(
                """
                SELECT free_ids, current_max
                FROM machine_name_counters
                WHERE owner_uuid = %s AND name = %s
                """,
                (self.owner_uuid, self.machine_name)
                                                    
            )
            
            row = await cursor.fetchone()
            
            if row is None:
                raise Exception(f"Failed to load machine name counter state for {self.owner_uuid}:{self.machine_name}.")
            
            self.free_ids = list(row[0])
            self.current_max = int(row[1])
        
        else:
            raise Exception(f"Connection to the Database is not open. Cannot load state for {self.owner_uuid}:{self.machine_name}.")
    
    
    async def _save_state(self) -> None:
        if self._connection is not None:
            await self._connection.execute(
                """
                UPDATE machine_name_counters
                SET free_ids = %s, current_max = %s
                WHERE owner_uuid = %s AND name = %s
                """,
                (self.free_ids, self.current_max, self.owner_uuid, self.machine_name)
            )
            
        else:
            raise Exception(f"Connection to the Database is not open. Cannot save state for {self.owner_uuid}:{self.machine_name}.")
    
   
    def get_next(self) -> int:
        if self.free_ids:
            return self.free_ids.pop(0)
        else:
            self.current_max += 1
            return self.current_max
    
    
    def release(self, ordinal_number: int) -> None:
        insort(self.free_ids, ordinal_number)

################################
#          Creation
################################
async def create_machine_async(machine: CreateMachineForm, owner_uuid: UUID) -> UUID:
    """
    Creates a single machine transactionally.\n
    In the event of a failure, it rolls back DB changes and cleans up libvirt definitions.
    """
    
    machine_parameters = translate_machine_form_to_machine_parameters(machine)
    
    machine_parameters.uuid = uuid4()
    
    async with NameCounter(async_pool, owner_uuid, machine.title) as counter:
        machine_parameters.ordinal_number = counter.get_next()
    
    insert_owner = """
        INSERT INTO deployed_machines_owners (machine_uuid, owner_uuid)
        VALUES (%s, %s);
    """
    
    insert_client = """
        INSERT INTO deployed_machines_clients (machine_uuid, client_uuid)
        VALUES (%s, %s);
    """
    
    insert_guacamole_connection = """
        INSERT INTO guacamole_connection (connection_name, protocol, proxy_port, proxy_hostname, proxy_encryption_method)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING connection_id;
    """
    
    insert_guacamole_connection_permission = """
        INSERT INTO guacamole_connection_permission (entity_id, connection_id, permission)
        VALUES (%s, %s, %s);
    """
    
    select_guacamole_entity_id = """
        SELECT entity_id FROM guacamole_entity WHERE name = %s::varchar;
    """
    
    insert_guacamole_connection_parameter = """
        INSERT INTO guacamole_connection_parameter (connection_id, parameter_name, parameter_value)
        VALUES (%s, %s, %s)
    """
    
    insert_internet_connection = """
        INSERT INTO internet_connections (machine_uuid, interface_mac)
        VALUES (%s, %s)
    """
    
    async with async_pool.connection() as connection:
        async with connection.cursor() as cursor:
            async with connection.transaction():
                try:
                    logger.debug("Retrieving cherry-ras network bridge IP.")
                    ras_ip = await asyncio.to_thread(get_network_bridge_ip, ENV_CONFIG.NETWORK_RAS_NAME)
                    connection_parameters = [("hostname", ras_ip), ("port", "0")]
                    
                    # At this stage the records are not commited yet. They will remain in this state until the machine is sucessfully defined through the Libvirt API (when no exceptions occur).
                    # Insert record to deployed_machines_owners table.
                    logger.debug(f"Inserting record into deployed_machines_owners for {machine_parameters.uuid}.")
                    await cursor.execute(insert_owner, (machine_parameters.uuid, owner_uuid))
                    
                    logger.debug(f"Inserting record(s) into deployed_machines_clients for {machine_parameters.uuid}.")
                    # Insert records to deployed_machines_clients table for every client assigned to a machine.
                    for client_uuid in machine_parameters.assigned_clients:
                        await cursor.execute(insert_client, (machine_parameters.uuid, client_uuid))
                    
                    
                    logger.debug(f"Inserting record(s) into guacamole_connection for {machine_parameters.framebuffer.type}")
                    await cursor.execute(insert_guacamole_connection, (
                        f"{machine_parameters.uuid}_{machine_parameters.framebuffer.type}", 
                        machine_parameters.framebuffer.type, 
                        4822, 
                        ENV_CONFIG.GUACD_HOSTNAME, 
                        "NONE"
                    ))
                    
                    insert_result = await cursor.fetchone()
                    if insert_result is not None:
                        connection_id = insert_result["connection_id"]
                    else:
                        raise Exception(f"Failed to retrieve connection_id from guacamole_connection insert query for {machine_parameters.uuid}.")
                    
                    logger.debug(f"Fetching guacamole entity_id corresponding to owner_uuid.")
                    await cursor.execute(select_guacamole_entity_id, (str(owner_uuid),))
                    
                    entity_id_result = await cursor.fetchone()
                    if entity_id_result:
                        owner_id = entity_id_result["entity_id"]
                    else:
                        raise Exception(f"Failed to retrieve entity_id from guacamole_entity for {owner_uuid}.")
                    
                    logger.debug(f"Inserting records(s) into guacamole_connection_permission for owner {owner_uuid}.")
                    for permission in ConnectionPermissions:
                        await cursor.execute(insert_guacamole_connection_permission, (
                            int(owner_id),
                            int(connection_id),
                            permission
                        ))
                    
                    for client in machine_parameters.assigned_clients:
                        logger.debug(f"Fetching guacamole entity_id corresponding to client_uuid.")
                        await cursor.execute(select_guacamole_entity_id, (str(client),))
                        
                        entity_id_result = await cursor.fetchone()
                        if entity_id_result:
                            client_id = entity_id_result["entity_id"]
                        else:
                            raise Exception(f"Failed to retrieve entity_id from guacamole_entity for {client}.")
                        
                        logger.debug(f"Inserting records(s) into guacamole_connection_permission for {client}.")
                        await cursor.execute(insert_guacamole_connection_permission, (
                            client_id,
                            connection_id,
                            "READ"
                        ))

                    logger.debug(f"Inserting records into guacamole_connection_parameter for {machine_parameters.uuid}.")
                    for parameter, value in connection_parameters:
                        await cursor.execute(insert_guacamole_connection_parameter, (
                            connection_id,
                            parameter,
                            value
                        ))
                    
                    logger.debug(f"Starting parallel disk creation for machine {machine_parameters.uuid}")
                    # Creation tasks to be run concurrently in separate threads.
                    disk_tasks = [asyncio.to_thread(create_machine_disk, disk) for disk in [machine_parameters.system_disk, *(machine_parameters.additional_disks or [])]]
                    
                    created_disk_uuids = await asyncio.gather(*disk_tasks)
                    
                    # Assigned returned UUIDs to corresponding disk elements in machine model
                    machine_parameters.system_disk.uuid = created_disk_uuids[0]
                    if machine_parameters.additional_disks is not None:
                        for index, disk in enumerate(machine_parameters.additional_disks, start = 1):
                            disk.uuid = created_disk_uuids[index]
                    
                    # Network interfaces need to be modified, each with their own unique MAC address as Libvirt does not use UUIDs when identifying interfaces
                    if machine_parameters.internet_connectivity is True:
                        logger.debug(f"Creating Internet interface for machine {machine_parameters.uuid}")
                        internet_interface_mac = generate_random_mac()
                        machine_parameters.internet_interface = InternetInterface(mac=internet_interface_mac)
                        
                        logger.debug(f"Inserting db records into internet_connections for machine {machine_parameters.uuid}")
                        await cursor.execute(insert_internet_connection, (machine_parameters.uuid, internet_interface_mac))
                        
                    # MachineParameters instance populated with disk UUIDs is passed on to be translated into a Libvirt accepted XML string.
                    machine_xml = create_machine_xml(machine_parameters, machine_parameters.uuid)
                    
                    # Async Libvirt machines definiton. By default Libvirt operations are synchronous.
                    def define_machine():
                        with LibvirtConnection("rw") as libvirt_connection:
                            # Before the machine is actually defined the machine_xml string is automatically validated against built-in schemas by Libvirt internally.
                            # This adds another layer of protection so as to catch any misconfiguration before machine definition or runtime.
                            logger.debug(f"Defining machine {machine_parameters.uuid}.")
                            libvirt_connection.defineXMLFlags(machine_xml, libvirt.VIR_DOMAIN_DEFINE_VALIDATE)
                    
                    logger.debug(f"Awaiting {machine_parameters.uuid} machine definition.")
                    # Synchronous Libvirt logic needs to be wrapped with asyncio.to_thread() to be run in a separate thread.
                    await asyncio.to_thread(define_machine)
                    
                    logger.info(f"Machine {machine_parameters.uuid} created succesfully.")
                    return machine_parameters.uuid
                
                
                except libvirt.libvirtError as e:
                    # Run created disks cleanup.
                    # Same case as with define_machine() - machine_disks_cleanup() is synchronous and needs to be run using using asyncio in a separate thread.
                    await asyncio.to_thread(machine_disks_cleanup, machine_parameters)
                    raise Exception(f"Failed to define machine {machine_parameters.uuid} because of Libvirt error:\n{e}")
                
                except Exception as e:
                    await asyncio.to_thread(machine_disks_cleanup, machine_parameters)
                    raise Exception(f"Failed to define machine {machine_parameters.uuid}:\n{e}")


async def create_machine_async_bulk(machines: List[MachineBulkSpec], owner_uuid: UUID, group_uuid: Optional[UUID] = None) -> list[UUID]:
    """
    Creates a number of machines transactionally in parallel.\n
    In the event of a failure, it rolls back DB changes and cleans up libvirt definitions for every machine.\n
    """
    
    if not all(machine.machine_count > 0 for machine in machines):
        raise ValueError("Every machine_count in MachineBulkSpec must be greater than or equal to 1.")
    
    group_members: list[UUID] = []
    if group_uuid is not None:
        group_members = select_single_field("client_uuid", "SELECT client_uuid FROM clients_groups WHERE group_uuid = %s", (group_uuid, ))
        if not group_members:
            raise Exception(f"No users found in group {group_uuid}. Cannot create machines.")
    
    machines_config: list[tuple[MachineParameters, int]] = []
    
    for machine in machines:
        machines_config.append((translate_machine_form_to_machine_parameters(machine.machine_config), machine.machine_count))
        
    insert_owner = """
        INSERT INTO deployed_machines_owners (machine_uuid, owner_uuid)
        VALUES (%s, %s);
    """
    
    insert_client = """
        INSERT INTO deployed_machines_clients (machine_uuid, client_uuid)
        VALUES (%s, %s);
    """
    
    insert_guacamole_connection = """
        INSERT INTO guacamole_connection (connection_name, protocol, proxy_port, proxy_hostname, proxy_encryption_method)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING connection_id;
    """
    
    insert_guacamole_connection_permission = """
        INSERT INTO guacamole_connection_permission (entity_id, connection_id, permission)
        VALUES (%s, %s, %s);
    """
    
    select_guacamole_entity_id = """
        SELECT entity_id FROM guacamole_entity WHERE name = %s::varchar;
    """
    
    insert_guacamole_connection_parameter = """
        INSERT INTO guacamole_connection_parameter (connection_id, parameter_name, parameter_value)
        VALUES (%s, %s, %s)
    """
    
    insert_internet_connection = """
        INSERT INTO internet_connections (machine_uuid, interface_mac)
        VALUES (%s, %s)
    """
    
    created_machines: list[UUID] = []
    
    machine_clones: list[MachineParameters] = []
    
    logger.debug("Creating machine clones.")
    
    
    if group_uuid is not None:
        for client_uuid in group_members:
            for machine, machine_count in machines_config:
                async with NameCounter(async_pool, owner_uuid, machine.title) as counter:
                    for _ in range(machine_count):
                        machine_clone = copy.deepcopy(machine)
                        machine_clone.uuid = uuid4()
                        machine_clone.ordinal_number = counter.get_next()
                        machine_clone.assigned_clients = {client_uuid}
                        machine_clones.append(machine_clone)
            
    else:
        for machine, machine_count in machines_config:
            for machine_clone in range(machine_count):
                async with NameCounter(async_pool, owner_uuid, machine.title) as counter:
                    machine_clone = copy.deepcopy(machine)
                    machine_clone.uuid = uuid4()
                    machine_clone.ordinal_number = counter.get_next()
                    machine_clones.append(machine_clone)
        

        
    async with async_pool.connection() as connection:
        async with connection.cursor() as cursor:
            async with connection.transaction():
                try:
                    logger.debug("Retrieving cherry-ras network bridge IP.")
                    ras_ip = await asyncio.to_thread(get_network_bridge_ip, ENV_CONFIG.NETWORK_RAS_NAME)
                    connection_parameters = [("hostname", ras_ip), ("port", "0")]
                    
                    # At this stage the records are not commited yet. They will remain in this state until all machines are sucessfully defined through the Libvirt API (when no exceptions occur).
                    for machine_clone in machine_clones:
                        # Insert record to deployed_machines_owners table for every machine clone.
                        logger.debug(f"Inserting record into deployed_machines_owners for {machine_clone.uuid}.")
                        await cursor.execute(insert_owner, (machine_clone.uuid, owner_uuid))

                        # Insert records to deployed_machines_clients table for every client assigned to a machine.
                        logger.debug(f"Inserting record(s) into deployed_machines_clients for {machine_clone.uuid}.")
                        for client_uuid in machine_clone.assigned_clients:
                            await cursor.execute(insert_client, (machine_clone.uuid, client_uuid))
                     
                        logger.debug(f"Inserting record(s) into guacamole_connection for {machine_clone.framebuffer.type}")
                        await cursor.execute(insert_guacamole_connection, (
                            f"{machine_clone.uuid}_{machine_clone.framebuffer.type}", 
                            machine_clone.framebuffer.type, 
                            4822, 
                            ENV_CONFIG.GUACD_HOSTNAME, 
                            "NONE"
                        ))
                        
                        insert_result = await cursor.fetchone()
                        if insert_result is not None:
                            connection_id = insert_result["connection_id"]
                        else:
                            raise Exception(f"Failed to retrieve connection_id from guacamole_connection insert query for {machine_clone.uuid}.")
                        
                        logger.debug(f"Fetching guacamole entity_id corresponding to owner_uuid.")
                        await cursor.execute(select_guacamole_entity_id, (str(owner_uuid),))
                        
                        entity_id_result = await cursor.fetchone()
                        if entity_id_result:
                            owner_id = entity_id_result["entity_id"]
                        else:
                            raise Exception(f"Failed to retrieve entity_id from guacamole_entity for {owner_uuid}.")
                        
                        logger.debug(f"Inserting records(s) into guacamole_connection_permission for owner {owner_uuid}.")
                        for permission in ConnectionPermissions:
                            await cursor.execute(insert_guacamole_connection_permission, (
                                owner_id,
                                connection_id,
                                permission
                            ))
                            
                        for client in machine_clone.assigned_clients:
                            logger.debug(f"Fetching guacamole entity_id corresponding to client_uuid.")
                            await cursor.execute(select_guacamole_entity_id, (str(client),))
                            
                            entity_id_result = await cursor.fetchone()
                            if entity_id_result:
                                client_id = entity_id_result["entity_id"]
                            else:
                                raise Exception(f"Failed to retrieve entity_id from guacamole_entity for {client}.")
                            
                            logger.debug(f"Inserting records(s) into guacamole_connection_permission for {client}.")
                            await cursor.execute(insert_guacamole_connection_permission, (
                                client_id,
                                connection_id,
                                "READ"
                            ))
                        
                        logger.debug(f"Inserting records into guacamole_connection_parameter for {machine_clone.uuid}.")
                        for parameter, value in connection_parameters:
                            await cursor.execute(insert_guacamole_connection_parameter, (
                                connection_id,
                                parameter,
                                value
                            ))
                        
                        # Network interfaces need to be modified, each with their own unique MAC address as Libvirt does not use UUIDs when identifying interfaces
                        if machine_clone.internet_connectivity is True:
                            logger.debug(f"Creating Internet interface for machine {machine_clone.uuid}")
                            internet_interface_mac = generate_random_mac()
                            machine_clone.internet_interface = InternetInterface(mac=internet_interface_mac)
                            
                            logger.debug(f"Inserting db records into internet_connections for machine {machine_clone.uuid}")
                            await cursor.execute(insert_internet_connection, (machine_clone.uuid, internet_interface_mac))
                        
                    # Async per machine disk creation
                    async def create_machine_disks_async(machine: MachineParameters):
                        logger.debug(f"Starting parallel disk creation for machine {machine.uuid}")
                        # Creation tasks to be run concurrently in separate threads.
                        disk_tasks = [asyncio.to_thread(create_machine_disk, disk) for disk in [machine.system_disk, *(machine.additional_disks or [])]]
                        
                        created_disk_uuids = await asyncio.gather(*disk_tasks)
                        
                        machine.system_disk.uuid = created_disk_uuids[0]
                        if machine.additional_disks is not None:
                            for index, disk in enumerate(machine.additional_disks, start = 1):
                                disk.uuid = created_disk_uuids[index]
                    
                        return machine
                    
                    # This step bundles all async creation functions for every machine clone, runs them concurrently and collects their results.
                    logger.debug(f"Starting disk creation for {len(machine_clones)} machines in bulk.") 
                    disk_creation_results = await asyncio.gather(
                        *(create_machine_disks_async(clone) for clone in machine_clones), 
                        return_exceptions= True
                    )
                    
                    # Check result of bulk creation. If any item in disk_creation_results is an exception then the creation failed and the transaction enters rollback state.
                    for result in disk_creation_results:
                        if isinstance(result, BaseException):
                            raise result
                    
                    logger.info(f"Succesfully created disks for {len(machine_clones)} in bulk.")
                    
                    
                    
                    # Async and concurrent Libvirt machines definiton. By default Libvirt operations are synchronous.
                    async def define_machine(machine: MachineParameters):
                        assert machine.uuid is not None
                        machine_xml = create_machine_xml(machine, machine.uuid)
                        
                        def define_sync():
                            with LibvirtConnection("rw") as libvirt_connection:
                                # Before the machine is actually defined the machine_xml string is automatically validated against built-in schemas by Libvirt internally.
                                # This adds another layer of protection so as to catch any misconfiguration before machine definition or runtime.
                                logger.debug(f"Defining machine {machine.uuid}.")
                                libvirt_connection.defineXMLFlags(machine_xml, libvirt.VIR_DOMAIN_DEFINE_VALIDATE)
                        
                        logger.debug(f"Awaiting {machine.uuid} machine definition.")
                        # Synchronous Libvirt logic needs to be wrapped with asyncio.to_thread() to be run in a separate thread.
                        await asyncio.to_thread(define_sync)
                        
                        logger.debug(f"Machine {machine.uuid} created succesfully.")
                        return machine.uuid
                    
                    # This step bundles all async creation functions for every machine clone, runs them concurrently and collects their results.
                    machine_creation_results = await asyncio.gather(
                        *(define_machine(clone) for clone in machine_clones),
                        return_exceptions=True
                    )
                    
                    # Check result of bulk creation. If any item in machine_creation_results is an exception then the creation failed and the transaction enters rollback state.
                    for result in machine_creation_results:
                        if isinstance(result, BaseException):
                            raise result
                        # If no exception occured then the result is the UUID of created machine
                        created_machines.append(result)
                        
                    logger.info(f"Succesfully created {len(created_machines)} machines transactionally.")
                    return created_machines

                except Exception as e:
                    # Bundle all of the cleanup tasks
                    logger.warning(f"Bulk machine creation failed.")
                    logger.debug(f"Initiating rollback of {len(created_machines)} machines...")
                    await asyncio.gather(*(delete_machine_async(created_machine) for created_machine in created_machines))
                    raise Exception(f"Error during bulk creation: {e}.\nRolled back {len(created_machines)} machines.")

################################
#         Deletion
################################
async def delete_machine_async(machine_uuid: UUID) -> bool:
    """
    Deletes a machine and other associated elements (DB entries, disks) asynchronously.\n
    Returns True if all of the elements are deleted succesfully, False otherwise.\n\n
    This function tries to delete as many elements associated with a given machine as possible.
    Because of this, it does not throw exceptions on single step failed but continues with components removal.\n
    Appropriate exceptions are thrown when the removal step fails.
    """
    from modules.machine_state.state_management import stop_machine
    
    # Avoid machine_parameters from being unbound between different try statements
    machine_parameters = None
    success = True
    
    # Read machine XML config and retrieve running configuration.
    try:
        def get_machine_xml():
            with LibvirtConnection("ro") as libvirt_connection:
                logger.debug(f"Fetching {machine_uuid} XML config.")
                machine = libvirt_connection.lookupByUUID(machine_uuid.bytes)
                return machine.XMLDesc(libvirt.VIR_DOMAIN_XML_INACTIVE)
                
        
        logger.debug(f"Awaiting {machine_uuid} XML config fetch.")
        raw_machine_xml = await asyncio.to_thread(get_machine_xml)
        
        logger.debug(f"Parsing {machine_uuid} XML config back to MachineParameters model.")
        machine_parameters = parse_machine_xml(raw_machine_xml)
        
    except libvirt.libvirtError as e:
        logger.exception(f"Failed to get XML configuration of machine {machine_uuid} because of Libvirt error: {e}")
        success = False
        
    except Exception as e:
        logger.exception(f"Unexpected error while getting XML configuration of machine {machine_uuid}:\n{e}")
        success = False

    try:
        # Stop machine asynchronously.
        await stop_machine(machine_uuid)
    except Exception as e:
        logger.warning(f"Failed to stop machine {machine_uuid}!")
        success = False
    
    
    
    try:
        # If machine_parameters was succesfully populated with values from XML configuration in the previous step then begin disks cleanup
        # In case the machine_parameters is not a valid instance of MachineParameters model, this step is skipped.
        if isinstance(machine_parameters, MachineParameters):
            
            owner_uuid = get_machine_owner_uuid(machine_uuid)
            
            if owner_uuid is not None:
                async with NameCounter(async_pool, owner_uuid, machine_parameters.title) as counter:
                    counter.release(machine_parameters.ordinal_number)
            else:
                logger.error(f"Could not find owner of machine {machine_uuid}. Cannot update machine_name_counters table for name {machine_parameters.title}.")
            
            
            system_disk = machine_parameters.system_disk
            additional_disks = machine_parameters.additional_disks
            
            disk_tasks = []
            
            if system_disk.uuid is not None:
                logger.debug(f"Deleting machine {machine_uuid} system disk.")
                disk_tasks.append(asyncio.to_thread(delete_machine_disk, system_disk.uuid, system_disk.pool))
            
            if additional_disks is not None:
                logger.debug(f"Deleting machine {machine_uuid} additional disks.")
                for disk in additional_disks:
                    if disk.uuid is not None:
                        disk_tasks.append(asyncio.to_thread(delete_machine_disk, disk.uuid, disk.pool))
            
            if disk_tasks:
                logger.debug(f"Scheduling deletion for the disks of machine {machine_uuid}")
                await asyncio.gather(*disk_tasks)
                
        else:
            logger.error(f"Failed to automatically delete disks created for machine {machine_uuid}.\nManual cleanup required!")
    
    except Exception as e:
        logger.exception(f"Disk cleanup failed for machine {machine_uuid}: {e}")
           
            
    
    try:
        # Delete records associated with a machine from the DB.
        delete_machine = """
            DELETE FROM deployed_machines_owners WHERE machine_uuid = %s;
        """
        
        select_guacamole_connection_id = """
            SELECT connection_id FROM guacamole_connection WHERE connection_name LIKE %s;
        """
        
        select_pattern = f"{machine_uuid}_%"
        
        delete_guacamole_connection = """
            DELETE FROM guacamole_connection WHERE connection_id = %s;
        """
        
        logger.debug(f"Deleting machine {machine_uuid} DB records.")
        async with async_pool.connection() as connection:
            async with connection.cursor() as cursor:
                async with connection.transaction():
                    await cursor.execute(delete_machine, (machine_uuid,))
                    
                    await cursor.execute(select_guacamole_connection_id, (select_pattern,))
                    results = await cursor.fetchall()
                    
                    if results:
                        for row in results:
                            connection_id = row["connection_id"]
                            logger.debug(f"Deleting guacamole connection_id: {connection_id}.")
                            await cursor.execute(delete_guacamole_connection, (connection_id,)) 
                    else:
                        raise Exception(f"Failed to retrieve connection_id from guacamole_connection for {machine_uuid}.")
                    
                    
    
    except Exception as e:
        logger.exception(f"Failed to delete all components associated with a machine {machine_uuid}: {e}")
        success = False
    
    
    
    try:
        def undefine_machine():
            with LibvirtConnection("rw") as libvirt_connection:
                try:
                    logger.debug(f"Trying to undefine machine {machine_uuid} configuration.")
                    machine = libvirt_connection.lookupByUUID(machine_uuid.bytes)
                    machine.undefineFlags(libvirt.VIR_DOMAIN_UNDEFINE_NVRAM)
                except libvirt.libvirtError as e:
                    logger.warning(f"Failed to undefine machine {machine_uuid} because of Libvirt error: {e}")
        
        await asyncio.to_thread(undefine_machine)
    
    except Exception as e:
        logger.warning(f"Failed to undefine machine {machine_uuid}: {e}")
        success = False
    
    if success:
        logger.info(f"Succesfully deleted machine {machine_uuid} and all of the associated elements.")
    else:
        logger.warning(f"Failed to delete machine {machine_uuid}.\n Manual cleanup required!")

    return success

################################
#         Modification
################################
async def modify_machine_internet_connectivity(machine_uuid: UUID, enable_internet: bool):
     async with async_pool.connection() as connection:
            async with connection.cursor() as cursor:
                async with connection.transaction():
                    try:  
                        await cursor.execute("SELECT interface_mac FROM internet_connections WHERE machine_uuid = %s;", (machine_uuid,))
                        
                        internet_interface_result = await cursor.fetchone()
                        
                        if enable_internet is True and internet_interface_result is None:
                            attach_internet_interface(machine_uuid)
                        elif enable_internet is False and internet_interface_result is not None:
                            detach_internet_interface(machine_uuid)
                        else:
                            logger.info(f"No changes to Internet connectivity for machine {machine_uuid}.")
                            
                    except libvirt.libvirtError as e:
                        raise Exception(f"Failed to modify the Internet connectivity for machine {machine_uuid} because of Libvirt error:\n{e}")
            
                    except Exception as e:
                        raise Exception(f"Failed to modify the Internet connectivity for machine {machine_uuid}:\n{e}")


async def modify_machine(machine_uuid: UUID, form: ModifyMachineForm):
    if form.title is not None:
        pass
    if form.description is not None:
        pass
    if form.tags is not None:
        pass
    if form.assigned_clients is not None:
        update_machine_clients(machine_uuid, form.assigned_clients)
    if form.config is not None:
        pass
    if form.disks is not None:
        pass
    if form.internet_connectivity is not None:
        await modify_machine_internet_connectivity(machine_uuid, form.internet_connectivity)
