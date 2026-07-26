import logging
import libvirt
import asyncio

from uuid import UUID

from modules.libvirt_socket import LibvirtConnection
from modules.postgresql.main import async_pool
from config.machines_config import MACHINES_CONFIG
from modules.machine_lifecycle.networks import get_machine_framebuffer_port

logger = logging.getLogger(__name__)

###############################
#       VM state tasks
###############################
ERROR_STATES = [libvirt.VIR_DOMAIN_SHUTOFF, libvirt.VIR_DOMAIN_CRASHED]

vm_tasks: dict[UUID, asyncio.Task] = {}

async def wait_for_machine_state(machine):
    """
    Every state_poll_interval checks for VM state after starting it.
    
    Returns:
        - 'running' if machine started succesfully,
        - 'error' if error state,
        - 'unknown' if timeout exceeded,
    """
    async def poll_state():
        while True:
            state, _ = machine.state() #Unpacking only the 'state' part of the tuple, machine.state() called periodically returns the state() dynamically - machine is a reference not a static object with properties set during the connection lookup time
            if state == libvirt.VIR_DOMAIN_RUNNING:
                return 'running'
            elif state in ERROR_STATES:
                return 'error'
            await asyncio.sleep(MACHINES_CONFIG.vm_state_poll_interval)
    
    try:
        return await asyncio.wait_for(poll_state(), MACHINES_CONFIG.vm_state_wait_timeout)
    except asyncio.TimeoutError:
        return 'unknown'
    
    
###############################
#          VM Start
###############################             
async def start_machine_async(uuid: UUID):
    """
    Final async wrapper - starting VM and waiting for state feedback
    """
    
    with LibvirtConnection("rw") as libvirt_read_write_connection:
        try:
            machine = libvirt_read_write_connection.lookupByUUID(uuid.bytes)  # pyright: ignore[reportArgumentType]
            logging.debug(f"Trying to start {machine}")
            machine.create()
            result = await wait_for_machine_state(machine)   
                
        except libvirt.libvirtError as e:
            logging.error(f"Failed to start VM: {e}")
            raise libvirt.libvirtError(str(e))
        
        if result == "running":

            update_boot_timestamp = """
                UPDATE deployed_machines_owners
                SET started_at = LOCALTIMESTAMP
                WHERE machine_uuid = %s
            """

            framebuffer_port = get_machine_framebuffer_port(uuid)
            
            select_guacamole_connection_id = """
                SELECT connection_id FROM guacamole_connection WHERE connection_name ~ %s;
            """
            
            # Either <machine_uuid>_rdp or <machine_uuid>_vnc
            regex_pattern = f"^{uuid}_(vnc|rdp)$"
            
            update_guacamole_connection_parameter = """
                UPDATE guacamole_connection_parameter 
                SET parameter_value = %s 
                WHERE parameter_name = %s AND connection_id = %s;
            """
            
            async with async_pool.connection() as connection:
                async with connection.cursor() as cursor:
                    async with connection.transaction():
                        try:
                            await cursor.execute(update_boot_timestamp, (uuid,))
                            
                            # Find connection_id associated with machine's rdp/vnc connection
                            await cursor.execute(select_guacamole_connection_id, (regex_pattern,))
                            result = await cursor.fetchone()
                            
                            if result:
                                connection_id = result["connection_id"]
                                await cursor.execute(update_guacamole_connection_parameter, (framebuffer_port, "port", connection_id))
                            else:
                                raise Exception(f"Failed to retrieve connection_id from guacamole_connection for {uuid}.")
                        except Exception:
                            logger.exception(f"Failed to update {uuid} connection parameters - port {framebuffer_port}.")
        
    return result


async def start_machine(uuid: UUID):
    if is_vm_running(uuid):
        logging.error("Machine is already running!")
        return False
    
    if vm_tasks.get(uuid) and not vm_tasks[uuid].done():
        logging.error("Machine is already starting!")
        return False
    
    try:
        task = asyncio.create_task(start_machine_async(uuid))
        vm_tasks[uuid] = task
        result = await task
        vm_tasks.pop(uuid, None)
        return result
    except libvirt.libvirtError as e:
        logging.error(f"Failed to start VM: {e}")
        return False

###############################
#          VM Stop
############################### 
SHUTDOWN_FLAGS = [
    libvirt.VIR_DOMAIN_SHUTDOWN_GUEST_AGENT,
    libvirt.VIR_DOMAIN_SHUTDOWN_ACPI_POWER_BTN,
    libvirt.VIR_DOMAIN_SHUTDOWN_INITCTL,
    libvirt.VIR_DOMAIN_SHUTDOWN_SIGNAL,
    libvirt.VIR_DOMAIN_SHUTDOWN_PARAVIRT,
    libvirt.VIR_DOMAIN_SHUTDOWN_DEFAULT
]

async def stop_machine_async(uuid: UUID):
    """
     Final async wrapper - stopping VM and waiting for state feedback
    """

    with LibvirtConnection("rw") as libvirt_read_write_connection:
        try:
            machine = libvirt_read_write_connection.lookupByUUID(uuid.bytes)  # pyright: ignore[reportArgumentType]
            
            for FLAG in SHUTDOWN_FLAGS:
                try:
                    logging.debug(f"Trying to stop {machine} with {FLAG}")
                    machine.shutdownFlags(FLAG)
                    result = await wait_for_machine_state(machine)
                    
                    if result in ERROR_STATES:
                        return result
                    continue
                
                except libvirt.libvirtError as e:
                    logging.error(f"Failed to stop VM with flag {FLAG}: {e}")
                    continue
                
            logging.warning("Failed to stop VM gracefully. Forcing destroy.")
            machine.destroy()
            result = await wait_for_machine_state(machine)
             
        except libvirt.libvirtError as e:
            logging.error(f"Failed to stop VM: {e}")
            raise libvirt.libvirtError(str(e))
    
    update_boot_timestamp = """
        UPDATE deployed_machines_owners
        SET started_at = NULL
        WHERE machine_uuid = %s
    """
    
    select_guacamole_connection_id = """
        SELECT connection_id FROM guacamole_connection WHERE connection_name ~ %s;
    """

    # Either <machine_uuid>_rdp or <machine_uuid>_vnc
    regex_pattern = f"^{uuid}_(vnc|rdp)$"
        
    update_guacamole_connection_parameter = """
        UPDATE guacamole_connection_parameter 
        SET parameter_value = %s 
        WHERE parameter_name = %s AND connection_id = %s;
    """
        
    async with async_pool.connection() as connection:
        async with connection.cursor() as cursor:
            async with connection.transaction():
                try:
                    await cursor.execute(update_boot_timestamp, (uuid,))
                    
                    # Find connection_id associated with machine's rdp/vnc connection
                    await cursor.execute(select_guacamole_connection_id, (regex_pattern,))
                    result = await cursor.fetchone()
                    
                    if result:
                        connection_id = result["connection_id"]
                        await cursor.execute(update_guacamole_connection_parameter, (0, "port", connection_id))
                    else:
                        raise Exception(f"Failed to retrieve connection_id from guacamole_connection for {uuid}.")
                except Exception:
                    logger.exception(f"Failed to update {uuid} connection parameters - port 0.")
            
    return result

async def stop_machine(uuid: UUID):
    if not is_vm_running(uuid):
        logging.warning("Machine is not running!")
        return False
    
    if vm_tasks.get(uuid) and not vm_tasks[uuid].done():
        logging.error("Machine is already stopping!")
        return False

    try:
        task = asyncio.create_task(stop_machine_async(uuid))
        vm_tasks[uuid] = task
        result = await task
        vm_tasks.pop(uuid, None)
        return result
    except libvirt.libvirtError as e:
        logging.error(f"Failed to stop VM: {e}")
        return False


# ! to be moved to data_retrieval.py when we stop depending on the task list
def is_vm_loading(uuid: UUID) -> bool:
    task = vm_tasks.get(uuid)
    return task is not None and not task.done()

def is_vm_running(uuid: UUID) -> bool:
    with LibvirtConnection("ro") as libvirt_connection:
        machine = libvirt_connection.lookupByUUID(uuid.bytes) # pyright: ignore[reportArgumentType]
        state, _ = machine.state()
        if state == libvirt.VIR_DOMAIN_RUNNING:
            return True
        else:
            return False