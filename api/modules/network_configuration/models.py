from typing import Annotated, Literal
from uuid import UUID
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, Field, field_validator, model_validator
from ipaddress import IPv4Interface
from pydantic_extra_types.mac_address import MacAddress
from psycopg.types.json import Jsonb

from modules.global_models.models import UUIDModel
from modules.users.models import Administrator
from modules.validation.string import name_validator


################################
#     Coordinate System
################################
class Coordinates(BaseModel):                   
    x: float = 0
    y: float = 0

type Positions = dict[str, Coordinates]


################################
# Internal Networks Configuration
################################
class InternalNetworkSetForm(BaseModel):
    uuid: UUID
    intnet_name: str
    bridge_ip: IPv4Interface | None = None
    machines: list[UUID] | None = None
    
    @field_validator("intnet_name", mode="before")
    @classmethod
    def validate_username(cls, value):
        return name_validator(value, field_name="intnet_name")
    
class InternalNetworkGetForm(BaseModel):
    uuid: UUID
    intnet_name: str | None = None
    bridge_mac: MacAddress
    bridge_ip: IPv4Interface | None = None
    machines: dict[UUID, MacAddress]

class NetworkConfigurationSet(BaseModel):
    internal_networks: dict[UUID, InternalNetworkSetForm]
    machines_with_internet_access: list[UUID]
    
class NetworkConfigurationGet(BaseModel):
    internal_networks: dict[UUID, InternalNetworkGetForm]
    machines_with_internet_access: dict[UUID, MacAddress]

class NetworkWorkspace(BaseModel):         
    configuration: NetworkConfigurationSet | NetworkConfigurationGet
    positions: Positions = dict() # key: node id in the workspace

################################
# Networks Configuration Presets
################################

class BaseNetworkPanelPresetIntnetArg(BaseModel):
    logical_operator: Literal["or", "and"]
    negation: bool = False


class TitleArg(BaseNetworkPanelPresetIntnetArg):
    field: Literal["title"]
    operator: Literal["=", "includes", "starts_with", "ends_with", "is_the_same"]
    value: str


class TagsArg(BaseNetworkPanelPresetIntnetArg):
    field: Literal["tags"]
    operator: Literal["includes", "is_the_same"]
    value: str


class DescriptionArg(BaseNetworkPanelPresetIntnetArg):
    field: Literal["description"]
    operator: Literal["includes", "starts_with", "ends_with", "is_the_same"]
    value: str


class OwnerArg(BaseNetworkPanelPresetIntnetArg):
    field: Literal["owner"]
    operator: Literal["=", "is_the_same"]
    value: UUID


class AssignedClientsArg(BaseNetworkPanelPresetIntnetArg):
    field: Literal["assigned_clients"]
    operator: Literal["includes", "is_the_same"]
    value: UUID


class BulkIdArg(BaseNetworkPanelPresetIntnetArg):
    field: Literal["bulk_id"]
    operator: Literal["=", "<", ">", "is_odd", "is_even", "is_the_same"]
    value: int


NetworkPanelPresetIntnetArg = Annotated[
    TitleArg
    | TagsArg
    | DescriptionArg
    | OwnerArg
    | AssignedClientsArg
    | BulkIdArg,
    Field(discriminator="field"),
]

class NetworkPanelPresetInternalNetwork(BaseModel):
    name: str | None = None
    conditions: list[NetworkPanelPresetIntnetArg]   

class NetworkPanelPresetInDb(BaseModel):
    uuid: UUID
    owner_uuid: UUID
    name: str
    override_existing: bool = False
    internal_networks: list[NetworkPanelPresetInternalNetwork] 
 
class NetworkPanelPreset(BaseModel):
    uuid: UUID
    owner: Administrator | None = None
    name: str
    override_existing: bool = False
    internal_networks: list[NetworkPanelPresetInternalNetwork]
    
class CreateNetworkPanelPresetForm(BaseModel):
    name: str
    override_existing: bool = False
    internal_networks: list[NetworkPanelPresetInternalNetwork]
    
class CreateNetworkPanelPresetArgs(UUIDModel):
    owner_uuid: UUID
    name: str
    override_existing: bool = False
    internal_networks: Jsonb