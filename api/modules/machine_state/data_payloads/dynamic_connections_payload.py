import logging
from devtools import pprint
from uuid import UUID
from fastapi import HTTPException
from modules.users.models import AnyUser
from modules.machine_state.models import MachineConnectionsPayload
from modules.machine_state.queries import check_machine_existence, check_machine_membership, get_active_connections, get_all_machine_uuids, get_user_machine_uuids


logger = logging.getLogger(__name__)


# Returns active connections dynamic data of the machine.
def get_machine_connections_payload(machine_uuid: UUID, skip_membership_check: bool = False) -> MachineConnectionsPayload:
    if not skip_membership_check and not check_machine_membership(machine_uuid):
        raise HTTPException(status_code=500, detail="Requested data of a machine that is not managed by Cherry VM Studio.")
    
    return MachineConnectionsPayload(
        uuid = machine_uuid,
        active_connections = get_active_connections(machine_uuid),
    )
    

def get_machine_connections_payloads_by_uuids(machine_uuids: set[UUID] | list[UUID]) -> dict[UUID, MachineConnectionsPayload]:  
    machine_states: dict[UUID, MachineConnectionsPayload] = dict()
    
    for machine_uuid in machine_uuids.copy():
        if check_machine_existence(machine_uuid):
            state = None
            try:
                state = get_machine_connections_payload(machine_uuid, skip_membership_check=True)
            except Exception:
                logger.exception(f"Exception occured when fetching machine state in get_machine_connections_payload function for machine with uuid={machine_uuid}")
                
            if state is not None:
                machine_states[machine_uuid] = state    
            
    return machine_states
   
    
# Returns active connections  dynamic machine data for all machines owned and assigned to an account.
def get_user_machine_connections_payloads(user: AnyUser) -> dict[UUID, MachineConnectionsPayload]:
    machine_uuids = get_user_machine_uuids(user)
    return get_machine_connections_payloads_by_uuids(machine_uuids)
    
    
# Returns active connections  dynamic machine data for all machines managed by the Cherry VM Studio.
def get_all_machine_connections_payloads() -> dict[UUID, MachineConnectionsPayload]:
    machine_uuids = get_all_machine_uuids()
    return get_machine_connections_payloads_by_uuids(machine_uuids)