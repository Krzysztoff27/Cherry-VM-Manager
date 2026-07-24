import logging
from uuid import UUID


from .models import CreateIsoRecordArgs, IsoRecord, IsoRecordInDB
from modules.postgresql import pool
from modules.postgresql.simple_table_manager import SimpleTableManager
from modules.users.sublibraries.administrator_manager import AdministratorManager

logger = logging.getLogger(__name__)


def prepare_from_database_record(record: IsoRecordInDB) -> IsoRecord:
    imported_by = AdministratorManager.get_record_by_uuid(record.imported_by) if record.imported_by else None
    last_modified_by = AdministratorManager.get_record_by_uuid(record.last_modified_by) if record.last_modified_by else None
    file_location = record.file_location if record.remote else None
    
    return IsoRecord(
        **record.model_dump(exclude={"imported_by","last_modified_by","file_location"}),
        imported_by=imported_by,
        last_modified_by=last_modified_by,
        file_location=file_location
    )

def update_iso_last_used(iso_uuid: UUID):   
    with pool.connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(f"UPDATE iso_files SET last_used = CURRENT_TIMESTAMP WHERE uuid = %s", (iso_uuid,))


IsoManager = SimpleTableManager(
    table_name="iso_files",
    allowed_fields_for_select={"uuid", "name"},
    model=IsoRecord,
    model_in_db=IsoRecordInDB,
    model_creation_args=CreateIsoRecordArgs,
    prepare_record=prepare_from_database_record,
)