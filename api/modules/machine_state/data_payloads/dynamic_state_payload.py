import logging
import libvirt


from fastapi import HTTPException
from uuid import UUID
from devtools import pprint

from modules.machine_lifecycle.xml_translator import parse_machine_xml
from modules.machine_state.queries import check_machine_existence, check_machine_membership, get_all_machine_uuids, get_machine_boot_timestamp, get_user_machine_uuids
from modules.machine_state.state_management import is_vm_loading
from modules.machine_state.models import MachineStatePayload
from modules.libvirt_socket import LibvirtConnection
from modules.users.models import AnyUser


logger = logging.getLogger(__name__)


# Returns main dynamic data of the machine.
def get_machine_state_payload(machine_uuid: UUID, skip_membership_check: bool = False) -> MachineStatePayload:
    if not skip_membership_check and not check_machine_membership(machine_uuid):
        raise HTTPException(status_code=500, detail="Requested data of a machine that is not managed by Cherry VM Studio.")
    
    with LibvirtConnection("ro") as libvirt_connection:
        machine = libvirt_connection.lookupByUUID(machine_uuid.bytes) 
        parsed_machine = parse_machine_xml(machine.XMLDesc())
    
    is_active: bool = machine.state()[0] == libvirt.VIR_DOMAIN_RUNNING
    
    ras_port = None
    
    if parsed_machine.framebuffer is not None and parsed_machine.framebuffer.port is not None:
        ras_port = int(parsed_machine.framebuffer.port)
    
    return MachineStatePayload(
        uuid = machine_uuid,
        active = is_active,
        loading = is_vm_loading(machine.UUID()),
        vcpu = (machine.info()[3]),
        ram_max = (machine.info()[1]/1024),
        ram_used = (machine.info()[2]/1024) if is_active else 0,
        boot_timestamp = get_machine_boot_timestamp(machine_uuid),
        ras_port = ras_port,
    )
    

def get_machine_state_payloads_by_uuids(machine_uuids: set[UUID] | list[UUID]) -> dict[UUID, MachineStatePayload]:  
    machine_states: dict[UUID, MachineStatePayload] = dict()
    
    for machine_uuid in machine_uuids.copy():
        if check_machine_existence(machine_uuid):
            state = None
            try:
                state = get_machine_state_payload(machine_uuid, skip_membership_check=True)
            except Exception:
                logger.exception(f"Exception occured when fetching machine state in get_machine_state_payload function for machine with uuid={machine_uuid}")
            if state is not None:
                machine_states[machine_uuid] = state    
            
    return machine_states
   
    
# Returns main dynamic machine data for all machines owned and assigned to an account.
def get_user_machine_state_payloads(user: AnyUser) -> dict[UUID, MachineStatePayload]:
    machine_uuids = get_user_machine_uuids(user)
    return get_machine_state_payloads_by_uuids(machine_uuids)
    
    
# Returns main dynamic machine data for all machines managed by the Cherry VM Studio.
def get_all_machine_state_payloads() -> dict[UUID, MachineStatePayload]:
    machine_uuids = get_all_machine_uuids()
    return get_machine_state_payloads_by_uuids(machine_uuids)