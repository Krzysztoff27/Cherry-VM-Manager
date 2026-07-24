from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from config.permissions_config import PERMISSIONS
from modules.machine_state.queries import check_machine_access, check_machine_ownership, get_machine_connections, check_machine_existence, get_machine_linked_account_uuids
from modules.machine_state.data_payloads.static_properties_payload import get_all_machine_properties_payloads, get_machine_properties_payload, get_user_machine_properties_payloads
from modules.machine_state.models import MachinePropertiesPayload
from modules.machine_state.state_management import start_machine, stop_machine
from modules.authentication.validation import DependsOnAuthentication, DependsOnAdministrativeAuthentication, get_authenticated_administrator, get_authenticated_user
from modules.users.permissions import verify_permissions, has_permissions
from modules.machine_resources.iso_files.manager import update_iso_last_used
from modules.machine_lifecycle.xml_translator import *
from modules.machine_lifecycle.machines import *
from modules.machine_lifecycle.models import MachineParameters, MachineDisk, CreateMachineForm, MachineBulkSpec
from modules.machine_lifecycle.disks import get_machine_disk_size
from modules.machine_websockets.main_manager import MachineWebSocketManager
from modules.users.users import UsersManager

router = APIRouter(
    prefix='/machines',
    tags=['Virtual Machines'],
    dependencies=[Depends(get_authenticated_user)]
)

debug_router = APIRouter(
    prefix='/debug/machines',
    tags=['Debug'],
    dependencies=[Depends(get_authenticated_administrator)]
)


################################
#         Production
################################

@router.get("/global", response_model=dict[UUID, MachinePropertiesPayload], tags=['Machine Data'])
async def __get_all_machines__(current_user: DependsOnAuthentication) -> dict[UUID, MachinePropertiesPayload]:
    verify_permissions(current_user, PERMISSIONS.VIEW_ALL_VMS)
    return get_all_machine_properties_payloads()


@router.get("/account", response_model=dict[UUID, MachinePropertiesPayload], tags=['Machine Data'])
async def __get_user_machines__(current_user: DependsOnAuthentication) -> dict[UUID, MachinePropertiesPayload]:
    return get_user_machine_properties_payloads(current_user)

@router.get("/account/{uuid}", response_model=dict[UUID, MachinePropertiesPayload], tags=['Machine Data'])
async def __get_other_user_machines__(uuid: UUID, current_user: DependsOnAuthentication) -> dict[UUID, MachinePropertiesPayload]:
    if not has_permissions(current_user, PERMISSIONS.VIEW_ALL_VMS) and not check_machine_access(uuid, current_user):
        raise HTTPException(403, "You do not have the necessary permissions to access this resource.")
    
    user = UsersManager.get_user(uuid)
    
    if not user:
        raise HTTPException(404, f"User with UUID={uuid} does not exist.")
    
    return get_user_machine_properties_payloads(user)


@router.get("/machine/{uuid}", response_model=MachinePropertiesPayload | None, tags=['Machine Data'])
async def __get_machine__(uuid: UUID, current_user: DependsOnAuthentication) -> MachinePropertiesPayload | None:
    machine = get_machine_properties_payload(uuid)

    if not machine:
        raise HTTPException(404, f"Virtual machine of UUID={uuid} could not be found.")

    if not has_permissions(current_user, PERMISSIONS.VIEW_ALL_VMS) and not check_machine_access(uuid, current_user):
        raise HTTPException(403, "You do not have the necessary permissions to access this resource.")

    return machine


@router.post("/start/{uuid}", response_model=None, tags=['Machine State'])
async def __start_machine__(uuid: UUID, current_user: DependsOnAuthentication) -> None:
    if not check_machine_existence(uuid):
        raise HTTPException(404, f"Virtual machine of UUID={uuid} could not be found.")

    if not has_permissions(current_user, PERMISSIONS.MANAGE_ALL_VMS) and not check_machine_access(uuid, current_user):
        raise HTTPException(403, "You do not have the necessary permissions to manage this resource.")
    
    MachineWebSocketManager.on_machine_bootup_start(uuid)
    
    if not await start_machine(uuid):
        MachineWebSocketManager.on_machine_bootup_fail(uuid, f"Virtual machine of UUID={uuid} failed to start.")
        raise HTTPException(500, f"Virtual machine of UUID={uuid} failed to start.")
    
    MachineWebSocketManager.on_machine_bootup_success(uuid)
    

@router.post("/stop/{uuid}", response_model=None, tags=['Machine State'])
async def __stop_machine__(uuid: UUID, current_user: DependsOnAuthentication) -> None:
    if not check_machine_existence(uuid):
        raise HTTPException(404, f"Virtual machine of UUID={uuid} could not be found.")

    if not has_permissions(current_user, PERMISSIONS.MANAGE_ALL_VMS) and not check_machine_access(uuid, current_user):
        raise HTTPException(403, "You do not have the necessary permissions to manage this resource.")
    
    MachineWebSocketManager.on_machine_shutdown_start(uuid)
    
    if not await stop_machine(uuid):
        MachineWebSocketManager.on_machine_shutdown_fail(uuid, f"Virtual machine of UUID={uuid} failed to start.")
        raise HTTPException(500, f"Virtual machine of UUID={uuid} failed to stop.")
    
    MachineWebSocketManager.on_machine_shutdown_success(uuid)


@router.post("/create", response_model=UUID, tags=['Machine Management'])
async def __async_create_machine__(machine_parameters: CreateMachineForm, current_user: DependsOnAdministrativeAuthentication) -> UUID:
    machine_uuid = await create_machine_async(machine_parameters, current_user.uuid)

    if not machine_uuid:
        raise HTTPException(500, "Machine creation failed.")

    if machine_parameters.source_type == 'iso':
        update_iso_last_used(machine_parameters.source_uuid)

    MachineWebSocketManager.on_machine_create(machine_uuid)

    return machine_uuid


@router.post("/create/bulk", response_model=list[UUID], tags=['Machine Management'])
async def __async_create_machine_bulk__(machines: List[MachineBulkSpec], current_user: DependsOnAdministrativeAuthentication) -> list[UUID]:
    machine_uuids = await create_machine_async_bulk(machines, current_user.uuid)
    
    if not machine_uuids:
        raise HTTPException(500, f"Failed to create machines in bulk.")
    
    for machine_spec in machines:
        if machine_spec.machine_config.source_type == 'iso':
            update_iso_last_used(machine_spec.machine_config.source_uuid)
            
    for machine_uuid in machine_uuids:
        MachineWebSocketManager.on_machine_create(machine_uuid)
            
    return machine_uuids


@router.post("/create/for-group", response_model=list[UUID], tags=['Machine Management'])
async def __async_create_machine_for_group__(machines: List[MachineBulkSpec], current_user: DependsOnAdministrativeAuthentication, group_uuid: UUID) -> list[UUID]:
    machine_uuids = await create_machine_async_bulk(machines, current_user.uuid, group_uuid)
    
    if not machine_uuids:
        raise HTTPException(500, f"Machine creation for group {group_uuid} failed.")
    
    for machine_spec in machines:
        if machine_spec.machine_config.source_type == 'iso':
            update_iso_last_used(machine_spec.machine_config.source_uuid)
     
    for machine_uuid in machine_uuids:
        MachineWebSocketManager.on_machine_create(machine_uuid)
            
    return machine_uuids


@router.delete("/delete/{uuid}", response_model=None, tags=['Machine Management'])
async def __delete_machine_async__(uuid: UUID, current_user: DependsOnAdministrativeAuthentication) -> None:
    if not check_machine_existence(uuid):
        raise HTTPException(404, f"Virtual machine {uuid} could not be found.")
    
    if not has_permissions(current_user, PERMISSIONS.MANAGE_ALL_VMS) and not check_machine_ownership(uuid, current_user):
        raise HTTPException(403, "You do not have the permissions necessary to manage this resource.")
    
    linked_account_uuids = get_machine_linked_account_uuids(uuid)
    
    if not await delete_machine_async(uuid):
        raise HTTPException(500, f"Failed to delete machine {uuid}.")
    
    MachineWebSocketManager.on_machine_delete(uuid, linked_account_uuids)
    
    
@router.patch("/modify/{uuid}", response_model=None, tags=['Machine Management'])
async def __modify_machine__(uuid: UUID, body: ModifyMachineForm, current_user: DependsOnAdministrativeAuthentication):
    if not check_machine_existence(uuid):
        raise HTTPException(404, f"Virtual machine of UUID={uuid} could not be found.")
    
    if not has_permissions(current_user, PERMISSIONS.MANAGE_ALL_VMS) and not check_machine_access(uuid, current_user):
        raise HTTPException(403, "You do not have the necessary permissions to manage this resource.")
    
    await modify_machine(uuid, body)
    MachineWebSocketManager.on_machine_modify(uuid)
    

################################
#           Debug
################################
@debug_router.post("/debug/machine/xml/create", response_model=str)
async def __create_machine_xml__(machine_parameters: MachineParameters, machine_uuid: UUID, current_user: DependsOnAdministrativeAuthentication) -> str:
    if not has_permissions(current_user, PERMISSIONS.MANAGE_ALL_VMS):
        raise HTTPException(403, "You do not have the necessary permissions to manage this resource.")
    machine_xml = create_machine_xml(machine_parameters, machine_uuid)
    if not machine_xml:
        raise HTTPException(500, "Machine XML creation failed.")
    return machine_xml

@debug_router.get("/debug/machine/xml/parse", response_model=MachineParameters)
async def __parse_machine_xml__(machine_xml: str, current_user: DependsOnAdministrativeAuthentication) -> MachineParameters:
    if not has_permissions(current_user, PERMISSIONS.MANAGE_ALL_VMS):
        raise HTTPException(403, "You do not have the necessary permissions to manage this resource.")
    machine_parameters = parse_machine_xml(machine_xml)
    return machine_parameters

@debug_router.post("/debug/machine/disk/create", response_model=UUID)
async def __create_machine_disk__(machine_disk: MachineDisk, current_user: DependsOnAdministrativeAuthentication) -> UUID:
    if not has_permissions(current_user, PERMISSIONS.MANAGE_ALL_VMS):
        raise HTTPException(403, "You do not have the necessary permissions to manage this resource.")
    disk_uuid = create_machine_disk(machine_disk)
    return disk_uuid

@debug_router.delete("/debug/machine/disk/delete/{storage_pool}", response_model=None)
async def __delete_machine_disk__(disk_uuid: UUID, storage_pool: str, current_user: DependsOnAdministrativeAuthentication) -> None:
    if not has_permissions(current_user, PERMISSIONS.MANAGE_ALL_VMS):
        raise HTTPException(403, "You do not have the necessary permissions to manage this resource.")
    if not delete_machine_disk(disk_uuid, storage_pool):
        raise HTTPException(500, f"Failed to remove disk of UUID={disk_uuid}.")

@debug_router.get("/debug/machine/disk/size/{storage_pool}", response_model=int)
async def __get_machine_disk_size___(disk_uuid: UUID, storage_pool: str, current_user: DependsOnAdministrativeAuthentication) -> int:
    if not has_permissions(current_user, PERMISSIONS.MANAGE_ALL_VMS):
        raise HTTPException(403, "You do not have the necessary permissions to manage this resource.")
    disk_size = get_machine_disk_size(disk_uuid, storage_pool)
    return disk_size

@debug_router.get("/debug/machine/connections/{machine_uuid}", response_model=None)
async def __get_machine_connections__(machine_uuid: UUID) -> dict[Literal["ssh", "rdp", "vnc"], str]:
    return get_machine_connections(machine_uuid)
