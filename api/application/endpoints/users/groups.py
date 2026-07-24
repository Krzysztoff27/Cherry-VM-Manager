from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from modules.postgresql.models import RecordNotFoundException
from modules.users.users import UsersManager
from modules.users.models import GroupExtended, CreateGroupForm, RenameGroupBody
from modules.users.sublibraries.group_manager import GroupManager
from modules.authentication.validation import DependsOnAdministrativeAuthentication, DependsOnAuthentication, get_authenticated_user

router = APIRouter(
    prefix='/groups',
    tags=['Client Groups'],
    dependencies=[Depends(get_authenticated_user)]
)

@router.get("/group/{uuid}", response_model=GroupExtended, tags=['Client Groups'])
async def __read_group__(uuid: UUID,) -> GroupExtended:
    group = GroupManager.get_record_by_uuid(uuid)
    
    if group is None:
        raise HTTPException(404, f"Group with UUID={uuid} does not exist.")
    
    return GroupManager.extend_model(group)    


@router.get("/all", response_model=dict[UUID, GroupExtended], tags=['Client Groups'])
async def __read_groups__() -> dict[UUID, GroupExtended]:
    all_groups = GroupManager.get_all_records()
    
    for uuid, group in all_groups.items():
        all_groups[uuid] = GroupManager.extend_model(group)
    
    return all_groups
    

@router.post("/create", response_model=UUID, tags=['Client Groups'])
async def __create_group__(form: CreateGroupForm, current_user: DependsOnAdministrativeAuthentication) -> UUID:
    return UsersManager.create_group(form)


@router.delete("/delete/{uuid}", response_model=None, tags=['Client Groups'])
async def __delete_group__(uuid: UUID, current_user: DependsOnAdministrativeAuthentication) -> None:
    return GroupManager.remove_record(uuid)
    
    
@router.put("/join/{uuid}", response_model=None, tags=['Client Groups'])
async def __join_user_to_group__(uuid: UUID, clients: list[UUID], current_user: DependsOnAdministrativeAuthentication) -> None:
    for client in clients: 
        GroupManager.join_client_to_group(uuid, client)
        
    
@router.put("/leave/{uuid}", response_model=None, tags=['Client Groups'])
async def __remove_user_from_group__(uuid: UUID, clients: list[UUID], current_user: DependsOnAdministrativeAuthentication) -> None:
    for client in clients: 
        GroupManager.remove_client_from_group(uuid, client)
        
        
@router.patch("/rename/{uuid}", response_model=None, tags=['Client Groups'])
async def __rename_group__(uuid: UUID, form: RenameGroupBody, current_user: DependsOnAdministrativeAuthentication) -> None:
    try:
        GroupManager.modify_record_field(uuid, "name", form.name)
    except RecordNotFoundException:
        raise HTTPException(404, f"Group with UUID={uuid} does not exist.")