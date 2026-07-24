from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from modules.authentication.validation import DependsOnAdministrativeAuthentication, get_authenticated_administrator
from modules.machine_resources.machine_templates.manager import MachineTemplatesManager
from modules.machine_resources.machine_templates.models import CreateMachineTemplateArgs, CreateMachineTemplateForm, MachineTemplate

router = APIRouter(
    prefix='/machine-templates',
    tags=['Machine Templates'],
    dependencies=[Depends(get_authenticated_administrator)]
)

@router.get("/all", response_model=dict[UUID, MachineTemplate])
async def __read_all_machine_templates_belonging_to_user__(current_user: DependsOnAdministrativeAuthentication) -> dict[UUID, MachineTemplate]:
    return MachineTemplatesManager.get_all_records_matching(field_name="owner_uuid", value=str(current_user.uuid))


@router.get("/machine-template/{uuid}", response_model=MachineTemplate)
async def __read_machine_template__(uuid: UUID, current_user: DependsOnAdministrativeAuthentication) -> MachineTemplate:
    template = MachineTemplatesManager.get_record_by_uuid(uuid)
    if template is None: 
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Machine template with UUID={uuid} does not exist.")
    if not template.owner or template.owner.uuid != current_user.uuid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"You do not have the necessary permissions to manage this resource.")
    return template


@router.post("/create", response_model=None)
async def __create_machine_template__(data: CreateMachineTemplateForm, current_user: DependsOnAdministrativeAuthentication) -> None:
    name_duplicate = MachineTemplatesManager.get_record_by_fields(fields={"name": data.name, "owner_uuid": str(current_user.uuid)})
    
    if name_duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f'Machine template with name={data.name} already exists for this account.'
        )
    
    MachineTemplatesManager.create_record(CreateMachineTemplateArgs(**data.model_dump(), owner_uuid=current_user.uuid))
    

@router.delete("/delete/{uuid}" , response_model=None)
async def __delete_machine_template__(uuid: UUID, current_user: DependsOnAdministrativeAuthentication) -> None:
    template = MachineTemplatesManager.get_record_by_uuid(uuid)
    if template is None: 
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Machine template with UUID={uuid} does not exist.")
    if not template.owner or template.owner.uuid != current_user.uuid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"You do not have the necessary permissions to manage this resource.")
    
    MachineTemplatesManager.remove_record(uuid)