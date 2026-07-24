

from modules.network_configuration.models import CreateNetworkPanelPresetArgs, NetworkPanelPreset, NetworkPanelPresetInDb
from modules.postgresql.simple_table_manager import SimpleTableManager
from modules.users.sublibraries.administrator_manager import AdministratorManager

def prepare_from_database_record(record: NetworkPanelPresetInDb) -> NetworkPanelPreset:
    owner = AdministratorManager.get_record_by_uuid(record.owner_uuid)
    return NetworkPanelPreset(**record.model_dump(), owner=owner)


NetworkPanelPresetsManager = SimpleTableManager(
    table_name="network_panel_presets",
    allowed_fields_for_select={"uuid", "name"},
    model=NetworkPanelPreset,
    model_in_db=NetworkPanelPresetInDb,
    model_creation_args=CreateNetworkPanelPresetArgs,
    prepare_record=prepare_from_database_record
)

__all__= ["NetworkPanelPresetsManager"]