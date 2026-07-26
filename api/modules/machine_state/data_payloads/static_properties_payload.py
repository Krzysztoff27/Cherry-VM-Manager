import logging

from fastapi import HTTPException
from uuid import UUID
from devtools import pprint

from modules.machine_state.queries import check_machine_existence, check_machine_membership, get_machine_assigned_clients, get_machine_connections, get_machine_owner, get_user_machine_uuids, get_machine_network_interfaces
from modules.machine_state.models import MachinePropertiesPayload, StaticDiskInfo
from modules.libvirt_socket import LibvirtConnection
from modules.users.models import AnyUser
from modules.machine_lifecycle.xml_translator import parse_machine_xml

logger = logging.getLogger(__name__)

# Returns static machine data.
def get_machine_properties_payload(machine_uuid: UUID, skip_membership_check: bool = False) -> MachinePropertiesPayload:
    if not skip_membership_check and not check_machine_membership(machine_uuid):
        raise HTTPException(status_code=500, detail="Requested data of a machine that is not managed by Cherry VM Studio.")
    
    with LibvirtConnection("ro") as libvirt_connection:
        parsed_machine = parse_machine_xml(libvirt_connection.lookupByUUID(machine_uuid.bytes).XMLDesc()) # pyright: ignore[reportArgumentType]

    machine_disks = [StaticDiskInfo(system=True, name=parsed_machine.system_disk.name, size_bytes=parsed_machine.system_disk.size, type=parsed_machine.system_disk.type)]
    
    if parsed_machine.additional_disks:
        machine_disks.extend(StaticDiskInfo(system=False, name=disk.name, size_bytes=disk.size, type=disk.type) for disk in parsed_machine.additional_disks)
        
    return MachinePropertiesPayload(
        uuid = machine_uuid,
        title = parsed_machine.title,
        ordinal_number = str(parsed_machine.ordinal_number),
        tags = [machine_metadata.value for machine_metadata in parsed_machine.metadata] if parsed_machine.metadata is not None else None,
        description = parsed_machine.description,
        owner = get_machine_owner(machine_uuid),
        assigned_clients = get_machine_assigned_clients(machine_uuid),
        disks = machine_disks,
        connections = get_machine_connections(machine_uuid),
        interfaces = get_machine_network_interfaces(machine_uuid)
        )
   
    
def get_machine_properties_payloads_by_uuids(machine_uuids: set[UUID] | list[UUID]) -> dict[UUID, MachinePropertiesPayload]: 
    machine_properties: dict[UUID, MachinePropertiesPayload] = dict()
    
    for machine_uuid in machine_uuids.copy():
        if check_machine_existence(machine_uuid):
            properties = None
            try:
                properties = get_machine_properties_payload(machine_uuid, skip_membership_check=True)
            except Exception as e:
                logger.error(f"Exception occured when fetching machine state in get_machine_properties_payload function for machine with uuid={machine_uuid}")
                logger.debug(pprint(e))
            if properties is not None:
                machine_properties[machine_uuid] = properties    
            
    return machine_properties
    
    
# Returns static machine data for all machines owned and assigned to an account.
def get_user_machine_properties_payloads(user: AnyUser) -> dict[UUID, MachinePropertiesPayload]: 
    machine_uuids = get_user_machine_uuids(user)     
    return get_machine_properties_payloads_by_uuids(machine_uuids)
    
    
# Returns static machine data for all machines managed by the Cherry VM Studio.
def get_all_machine_properties_payloads() -> dict[UUID, MachinePropertiesPayload]:
    with LibvirtConnection("ro") as libvirt_readonly_connection:
        machines = libvirt_readonly_connection.listAllDomains(0)
        
    machine_uuids = [UUID(machine.UUIDString()) for machine in machines]
    return get_machine_properties_payloads_by_uuids(machine_uuids)