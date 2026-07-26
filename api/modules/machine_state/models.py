from uuid import UUID
from pydantic import BaseModel
from typing import Literal

from datetime import datetime

from modules.users.models import Administrator, Client
from modules.machine_lifecycle.models import DiskType

################################
# Machine data retrieval models
################################
class StaticDiskInfo(BaseModel):
    system: bool
    name: str
    size_bytes: int
    type: DiskType
    
class DynamicDiskInfo(StaticDiskInfo):
    occupied_bytes: int

class StaticInterfaceInfo(BaseModel):
    mac: str
    ip: str | None = None
    # name: str

class MachinePropertiesPayload(BaseModel):
    uuid: UUID                                      
    title: str | None = None
    ordinal_number: str | None = None
    tags: list[str] | None = None
    description: str | None = None        
    owner: Administrator | None = None          
    assigned_clients: dict[UUID, Client] = {}
    connections: dict[Literal["ssh", "rdp", "vnc"], str] | None = None
    disks: list[StaticDiskInfo] | None = None
    interfaces: list[StaticInterfaceInfo] | None = None


class MachineStatePayload(BaseModel):
    uuid: UUID  
    active: bool = False                            
    loading: bool = False                                 
    vcpu: int = 0                                    
    ram_max: int | None = None                      
    ram_used: int | None = None                     
    boot_timestamp: datetime | None = None   
    ras_ip: str | None = None   
    ras_port: int | None = None


class MachineDisksPayload(BaseModel):
    uuid: UUID
    disks: list[DynamicDiskInfo] | None = None
    

class MachineConnectionsPayload(BaseModel):
    uuid: UUID
    active_connections: list | None = None