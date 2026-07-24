import os
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from config.permissions_config import PERMISSIONS
from config.files_config import FILES_CONFIG
from modules.users.permissions import verify_permissions
from modules.machine_resources.iso_files.manager import IsoManager
from modules.authentication.validation import DependsOnAdministrativeAuthentication, get_authenticated_administrator
from modules.machine_resources.iso_files.models import IsoRecord

router = APIRouter(
    prefix='/iso',
    tags=['ISO Library'],
    dependencies=[Depends(get_authenticated_administrator)]
)

@router.get("/all", response_model=dict[UUID, IsoRecord])
async def __read_all_iso_file_records__(current_user: DependsOnAdministrativeAuthentication) -> dict[UUID, IsoRecord]:
    return IsoManager.get_all_records()


@router.get("/iso/{uuid}", response_model=IsoRecord)
async def __read_iso_file_record__(uuid: UUID, current_user: DependsOnAdministrativeAuthentication) -> IsoRecord:
    record = IsoManager.get_record_by_uuid(uuid)
    if record is None: 
        raise HTTPException(status_code=404, detail=f"ISO file with UUID={uuid} does not exist.")
    return record


@router.delete("/delete/{uuid}", response_model=None)
async def __delete_iso_file_record__(uuid: UUID, current_user: DependsOnAdministrativeAuthentication):
    verify_permissions(current_user, mask=PERMISSIONS.MANAGE_ISO_FILES)
        
    record = IsoManager.get_record_by_uuid(uuid)
    
    if record is None: 
        raise HTTPException(status_code=404, detail=f"ISO file with UUID={uuid} does not exist.")
    
    if not record.remote: 
        local_file_path = os.path.join(FILES_CONFIG.upload_iso_directory, f"{record.uuid}.iso")
        
        if os.path.exists(local_file_path): 
            os.remove(local_file_path)
        
    IsoManager.remove_record(uuid)