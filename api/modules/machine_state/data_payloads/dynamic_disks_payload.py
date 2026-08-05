import logging
from fastapi import HTTPException
from uuid import UUID
from devtools import pprint

from modules.exceptions.models import RaisedException
from modules.machine_state.queries import check_machine_existence, check_machine_membership, get_all_machine_uuids, get_user_machine_uuids
from modules.machine_state.models import MachineDisksPayload, DynamicDiskInfo
from modules.libvirt_socket import LibvirtConnection
from modules.users.models import AnyUser
from modules.machine_lifecycle.xml_translator import parse_machine_xml


logger = logging.getLogger(__name__)


# Returns dynamic disk data of the machine.
def get_machine_disks_payload(machine_uuid: UUID, skip_membership_check: bool = False) -> MachineDisksPayload:
    if not skip_membership_check and not check_machine_membership(machine_uuid):
        raise HTTPException(status_code=500, detail="Requested data of a machine that is not managed by Cherry VM Studio.")
    
    with LibvirtConnection("ro") as libvirt_connection:
        machine = libvirt_connection.lookupByUUID(machine_uuid.bytes) 
        
    machine_parameters = parse_machine_xml(machine.XMLDesc())
    
    if machine_parameters.system_disk.uuid is None:
        raise RaisedException("Supplied an inprocessable MachineDisk model without a valid UUID!")
    
    machine_disks = [DynamicDiskInfo(system=True, name=machine_parameters.system_disk.name, size_bytes=machine_parameters.system_disk.size, type=machine_parameters.system_disk.type, occupied_bytes=0)]
    
    if machine_parameters.additional_disks:
        for disk in machine_parameters.additional_disks:
            if disk.uuid is None:
                raise RaisedException("Supplied an inprocessable MachineDisk model without a valid UUID!")
        
        machine_disks.extend(
            DynamicDiskInfo(
                system=False, 
                name=disk.name, 
                size_bytes=disk.size, 
                type=disk.type, 
                occupied_bytes=0
            ) for disk in machine_parameters.additional_disks
        )
    return MachineDisksPayload(
        uuid=machine_uuid,
        disks=machine_disks
    )
    

def get_machine_disks_payloads_by_uuids(machine_uuids: set[UUID] | list[UUID]) -> dict[UUID, MachineDisksPayload]:  
    machine_disk_states: dict[UUID, MachineDisksPayload] = dict()
    
    for machine_uuid in machine_uuids.copy():
        if check_machine_existence(machine_uuid):
            state = None
            try:
                state = get_machine_disks_payload(machine_uuid, skip_membership_check=True)
            except Exception:
                logger.exception(f"Exception occured when fetching machine state in get_machine_disks_payload function for machine with uuid={machine_uuid}")
            if state is not None:
                machine_disk_states[machine_uuid] = state    
            
    return machine_disk_states
   
    
# Returns dynamic disk data for all machines owned and assigned to an account.
def get_user_machine_disks_payloads(user: AnyUser) -> dict[UUID, MachineDisksPayload]:
    machine_uuids = get_user_machine_uuids(user)
    return get_machine_disks_payloads_by_uuids(machine_uuids)
    
    
# Returns dynamic disk data for all machines managed by the Cherry VM Studio.
def get_all_machine_disks_payloads() -> dict[UUID, MachineDisksPayload]:
    machine_uuids = get_all_machine_uuids()
    return get_machine_disks_payloads_by_uuids(machine_uuids)