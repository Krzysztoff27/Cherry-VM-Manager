from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder

from config.permissions_config import PERMISSIONS
from modules.authentication.validation import DependsOnAdministrativeAuthentication, get_authenticated_administrator
from modules.network_configuration.models import CreateNetworkPanelPresetArgs, CreateNetworkPanelPresetForm, NetworkPanelPreset
from modules.network_configuration.presets import NetworkPanelPresetsManager
from modules.users.permissions import verify_permissions
from psycopg.types.json import Jsonb


router = APIRouter(
    prefix='/network/presets',
    dependencies=[Depends(get_authenticated_administrator)]
)


@router.get("/all", response_model=dict[UUID, NetworkPanelPreset])
async def __read_all_network_panel_presets_belonging_to_user__(current_user: DependsOnAdministrativeAuthentication) -> dict[UUID, NetworkPanelPreset]:
    return NetworkPanelPresetsManager.get_all_records_matching(field_name="owner_uuid", value=str(current_user.uuid))


@router.get("/preset/{uuid}", response_model=NetworkPanelPreset)
async def __read_network_panel_preset__(uuid: UUID, current_user: DependsOnAdministrativeAuthentication) -> NetworkPanelPreset:
    preset = NetworkPanelPresetsManager.get_record_by_uuid(uuid)
    
    if preset is None: 
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Network panel preset with UUID={uuid} does not exist.")
    
    has_manage_permission = verify_permissions(current_user, PERMISSIONS.MANAGE_ALL_VMS)
    is_owner = preset.owner and preset.owner.uuid == current_user.uuid
    
    if not has_manage_permission and not is_owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"You do not have the necessary permissions to manage this resource.")
    
    return preset


@router.post("/create", response_model=None)
async def __create_network_panel_preset__(data: CreateNetworkPanelPresetForm, current_user: DependsOnAdministrativeAuthentication):
    name_duplicate = NetworkPanelPresetsManager.get_record_by_fields(fields={"name": data.name, "owner_uuid": str(current_user.uuid)})
    
    if name_duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f'Network panel preset with name={data.name} already exists for this account.'
        )
        
    NetworkPanelPresetsManager.create_record(
        CreateNetworkPanelPresetArgs(
            **data.model_dump(exclude={"internal_networks"}),
            owner_uuid=current_user.uuid,
            internal_networks=Jsonb(jsonable_encoder(data.internal_networks))
        )
    )
    

@router.delete("/delete/{uuid}" , response_model=None)
async def __delete_network_panel_preset__(uuid: UUID, current_user: DependsOnAdministrativeAuthentication) -> None:
    preset = NetworkPanelPresetsManager.get_record_by_uuid(uuid)
    
    if preset is None: 
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Network panel preset with UUID={uuid} does not exist.")
    
    has_manage_permission = verify_permissions(current_user, PERMISSIONS.MANAGE_ALL_VMS)
    is_owner = preset.owner and preset.owner.uuid == current_user.uuid
        
    if not has_manage_permission and not is_owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"You do not have the necessary permissions to manage this resource.")
    
    NetworkPanelPresetsManager.remove_record(uuid)