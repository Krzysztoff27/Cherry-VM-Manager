from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from modules.authentication.validation import DependsOnAdministrativeAuthentication, get_authenticated_administrator
from modules.users.models import RoleExtended
from modules.users.sublibraries.roles_manager import RoleManager

router = APIRouter(
    prefix='/roles',
    tags=['Administrative Roles'],
    dependencies=[Depends(get_authenticated_administrator)]
)

@router.get("/role/{uuid}", response_model=RoleExtended)
async def __read_role__(uuid: UUID) -> RoleExtended:
    role = RoleManager.get_record_by_uuid(uuid)
    
    if role is None:
        raise HTTPException(400, f"Role with UUID={uuid} does not exist.")
    
    return RoleManager.extend_model(role)

@router.get("/all", response_model=dict[UUID, RoleExtended], tags=['Administrative Roles'])
async def __read_roles__() -> dict[UUID, RoleExtended]:
    all_roles = RoleManager.get_all_records()
    
    for uuid, roles in all_roles.items():
        all_roles[uuid] = RoleManager.extend_model(roles)
    
    return all_roles
