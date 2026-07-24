import logging

from modules.users.sublibraries.administrator_manager import AdministratorManager
from modules.machine_resources.machine_templates.models import CreateMachineTemplateArgs, MachineTemplate, MachineTemplateInDB
from modules.postgresql.simple_table_manager import SimpleTableManager

logger = logging.getLogger(__name__)


def prepare_from_database_record(record: MachineTemplateInDB) -> MachineTemplate:
    owner = AdministratorManager.get_record_by_uuid(record.owner_uuid)
    return MachineTemplate(**record.model_dump(), owner=owner)


MachineTemplatesManager = SimpleTableManager(
    table_name="machine_templates",
    allowed_fields_for_select={"uuid", "name", "owner_uuid"},
    model=MachineTemplate,
    model_in_db=MachineTemplateInDB,
    model_creation_args=CreateMachineTemplateArgs,
    prepare_record=prepare_from_database_record
)

