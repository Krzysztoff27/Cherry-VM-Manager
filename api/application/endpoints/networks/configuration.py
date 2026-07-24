from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from config.permissions_config import PERMISSIONS
from modules.authentication.validation import DependsOnAdministrativeAuthentication, get_authenticated_administrator
from modules.machine_state.queries import check_machine_access, check_machine_existence
from modules.network_configuration.models import NetworkWorkspace, Positions, NetworkConfigurationSet
from modules.network_configuration.configuration import get_current_network_configuration, get_flow_node_positions, save_flow_node_positions, set_network_configuration
from modules.network_configuration.validation import validate_machines_in_network_configuration
from modules.users.permissions import has_permissions
from modules.users.users import UsersManager

#Included for debug purposes only.
from modules.machine_lifecycle.networks import attach_network_interface, detach_network_interface, create_internal_network, delete_internal_network, modify_internal_network
from modules.machine_lifecycle.models import MachineNetworkInterface
from modules.network_configuration.models import InternalNetworkSetForm

router = APIRouter(
    prefix='/network',
    dependencies=[Depends(get_authenticated_administrator)]
)

debug_router = APIRouter(
    prefix='/debug/network',
    tags=['Network Debug'],
    dependencies=[Depends(get_authenticated_administrator)]
)

@router.get("/workspace", response_model=NetworkWorkspace, tags=['Network Configuration'])
def __get_current_network_configuration__(current_user: DependsOnAdministrativeAuthentication) -> NetworkWorkspace:
    return jsonable_encoder(NetworkWorkspace(
        configuration=get_current_network_configuration(current_user.uuid),
        positions=get_flow_node_positions(current_user.uuid)
    ))
    
@router.get("/workspace/{uuid}", response_model=NetworkWorkspace, tags=['Network Configuration'])
def __get_current_network_configuration_for_other_user__(uuid: UUID, current_user: DependsOnAdministrativeAuthentication) -> NetworkWorkspace:
    
    if uuid != current_user.uuid and not has_permissions(current_user, PERMISSIONS.VIEW_ALL_VMS):
        raise HTTPException(403, "You do not have the necessary permissions to access this resource.")
    
    if not UsersManager.get_user(uuid):
        raise HTTPException(404, f"User with UUID={uuid} does not exist.")
    
    return jsonable_encoder(NetworkWorkspace(
        configuration=get_current_network_configuration(uuid),
        positions=get_flow_node_positions(uuid)
    ))


@router.put("/configuration/networks", tags=['Network Configuration'])
def __apply_network_configuration_to_vms__(network_configuration: NetworkConfigurationSet, current_user: DependsOnAdministrativeAuthentication) -> None:
    validate_machines_in_network_configuration(network_configuration, current_user)
    set_network_configuration(current_user.uuid, network_configuration)
    
    
@router.put("/configuration/networks/{uuid}", tags=['Network Configuration'])
def __apply_network_configuration_to_other_user_vms__(uuid: UUID, network_configuration: NetworkConfigurationSet, current_user: DependsOnAdministrativeAuthentication) -> None:
    
    if uuid != current_user.uuid and not has_permissions(current_user, PERMISSIONS.VIEW_ALL_VMS):
        raise HTTPException(403, "You do not have the necessary permissions to access this resource.")
    
    if not UsersManager.get_user(uuid):
        raise HTTPException(404, f"User with UUID={uuid} does not exist.")
    
    validate_machines_in_network_configuration(network_configuration, current_user)
    set_network_configuration(uuid, network_configuration)
    
    
@router.put("/configuration/positions", tags=['Network Configuration'])
def __save_own_flow_state__(positions: Positions, current_user: DependsOnAdministrativeAuthentication) -> None:
    save_flow_node_positions(current_user.uuid, positions)
    

@router.put("/configuration/positions/{uuid}", tags=['Network Configuration'])
def __save_flow_state_for_user__(uuid: UUID, positions: Positions, current_user: DependsOnAdministrativeAuthentication) -> None:
    if uuid != current_user.uuid and not has_permissions(current_user, PERMISSIONS.VIEW_ALL_VMS):
        raise HTTPException(403, "You do not have the necessary permissions to access this resource.")
    
    if not UsersManager.get_user(uuid):
        raise HTTPException(404, f"User with UUID={uuid} does not exist.")
    
    save_flow_node_positions(uuid, positions)
    
################################
#           DEBUG
################################
@debug_router.put("/interface/attach", tags=['Network Debug'])
def __attach_network_interface__(machine_uuid: UUID, network_interface: MachineNetworkInterface, current_user: DependsOnAdministrativeAuthentication) -> None:
    if not check_machine_existence(machine_uuid):
        raise HTTPException(404, f"Virtual machine with UUID={machine_uuid} could not be found.")
    if not check_machine_access(machine_uuid, current_user):
        raise HTTPException(403, f"You do not have the necessary permissions to manage machine with UUID={machine_uuid}.")
    
    attach_network_interface(machine_uuid, network_interface)
    
@debug_router.put("/interface/detach", tags=['Network Debug'])
def __detach_network_interface__(machine_uuid: UUID, mac_address: str, current_user: DependsOnAdministrativeAuthentication) -> None:
    if not check_machine_existence(machine_uuid):
        raise HTTPException(404, f"Virtual machine with UUID={machine_uuid} could not be found.")
    if not check_machine_access(machine_uuid, current_user):
        raise HTTPException(403, f"You do not have the necessary permissions to manage machine with UUID={machine_uuid}.")
    
    detach_network_interface(machine_uuid, mac_address)
    
@debug_router.post("/internal_network/create", tags=['Network Debug'])
def __create_internal_network__(owner_uuid: UUID, internal_network_set_form: InternalNetworkSetForm, current_user: DependsOnAdministrativeAuthentication) -> None:
    
    create_internal_network(owner_uuid, internal_network_set_form)
    
@debug_router.delete("/internal_network/delete/{uuid}", tags=['Network Debug'])
def __delete_internal_network__(uuid: UUID, current_user: DependsOnAdministrativeAuthentication) -> None:
    
    delete_internal_network(uuid)

@debug_router.put("/internal_network/modify", tags=['Network Debug'])
def __modify_internal_network__(intnet_uuid: UUID, internal_network_set_form: InternalNetworkSetForm, current_user: DependsOnAdministrativeAuthentication) -> None:
    
    modify_internal_network(intnet_uuid, internal_network_set_form)
    
