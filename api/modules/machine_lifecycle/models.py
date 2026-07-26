from uuid import UUID
from pydantic import BaseModel, field_validator, model_validator, Field
from typing import Optional, Literal
from pydantic_extra_types.mac_address import MacAddress
from ipaddress import IPv4Interface

from modules.validation.string import description_validator, name_validator, short_name_validator
from modules.validation.int import int_validator

################################
#   Machine creation models
################################
DiskType = Literal["raw", "qcow2", "qed", "qcow", "luks", "vdi", "vmdk", "vpc", "vhdx"]
StoragePools = Literal["cvms-disk-images", "cvms-iso-images", "cvms-network-filesystems"]

ConnectionPermissions = ["READ", "UPDATE", "DELETE", "ADMINISTER"]

class MachineMetadata(BaseModel):
    tag: str
    value: str


class StoragePool(BaseModel):
    # For now the StoragePool selection is limited to predefined pools on local filesystem
    pool: StoragePools
    # Volume is basically disk name + disk type eg. "disk.qcow2"
    volume: str


class MachineDisk(BaseModel):
    uuid: Optional[UUID] = None
    name: str
    size: int # in Bytes
    type: DiskType
    pool: StoragePools
    

class NetworkInterfaceSource(BaseModel):
    type: Literal["network", "bridge"]
    value: str

class MachineNetworkInterface(BaseModel):
    mac: Optional[MacAddress] = None
    ip: Optional[IPv4Interface] = None
    name: str | None = None
    source: NetworkInterfaceSource

class InternetInterface(MachineNetworkInterface):
    name: str = "Internet"
    
    source: NetworkInterfaceSource = Field(
        default_factory=lambda: NetworkInterfaceSource(type="network", value="cherry-vm")
    )

class MachineGraphicalFramebuffer(BaseModel):
    type: Literal["rdp", "vnc"]
    port: str | None = None
    autoport: bool
    listen_type: Literal["network", "address"]
    listen_network: str | None = None
    listen_address: str | None = None
    
    @model_validator(mode="after")
    def check_listen_type(self):
        if self.listen_type == "network" and self.listen_network is None:
            raise ValueError("listen_network is required when listen_type is 'network'")
        if self.listen_type == "address" and self.listen_address is None:
            raise ValueError("listen_address is required when listen_type is 'address'")
        return self


class MachineParameters(BaseModel):
    uuid: UUID | None = None                   
    title: str
    ordinal_number: int                                                                             
    description: Optional[str] = None
    
    metadata: Optional[list[MachineMetadata]] = None 
          
    ram: int # in MiB                                  
    vcpu: int                                           
    
    system_disk: MachineDisk                        
    additional_disks: Optional[list[MachineDisk]] = None            
    
    iso_image: Optional[StoragePool] = None
                                              
    network_interfaces: Optional[list[MachineNetworkInterface]] = None
    
    internet_connectivity: bool = False
    internet_interface: Optional[InternetInterface] = None
    
    # As long as default SSH access is not configured automatically the framebuffer element is obligatory, otherwise machine would be inaccessible.
    framebuffer: MachineGraphicalFramebuffer
    
    assigned_clients: set[UUID]
    
    
################################
#     Machine form models
################################
class CreateMachineFormDisk(BaseModel):
    name: str
    size_bytes: int
    type: DiskType
    
    @field_validator("name", mode="before")
    @classmethod
    def validate_name(cls, value):
        return name_validator(value)
    
    @field_validator("size_bytes", mode="before")
    @classmethod
    def validate_size(cls, value):
        return int_validator(
            value=value,
            min_value=1048576 # 1 MiB
        )
    
      
class CreateMachineFormConfig(BaseModel):
    ram: int    # in MiB
    vcpu: int   # vcpu count
    
    
    @field_validator("ram", mode="before")
    @classmethod
    def validate_ram(cls, value):
        return int_validator(
            value=value, 
            min_value=512, 
            field_name="RAM"
        )
    
    @field_validator("vcpu", mode="before")
    @classmethod
    def validate_vcpu(cls, value):
        return int_validator(
            value=value, 
            min_value=1,
            field_name="VCPU"
        )
      
      
class CreateMachineFormConnectionProtocols(BaseModel):
    vnc: bool
    rdp: bool
    ssh: bool
    
class CreateMachineForm(BaseModel):
    title: str
    description: str
    tags: set[str]
    
    connection_protocols: CreateMachineFormConnectionProtocols
    assigned_clients: set[UUID]
    
    source_type: Literal["iso", "snapshot"]
    source_uuid: UUID
    
    config: CreateMachineFormConfig
    disks: list[CreateMachineFormDisk]
    os_disk: int = 0
    
    internet_connectivity: bool = False      
        
    @field_validator("title", mode="before")
    @classmethod
    def validate_title(cls, value):
        return name_validator(value, field_name="title")
    
    @field_validator("description", mode="before")
    @classmethod
    def validate_description(cls, value):
        return description_validator(value)   
    
    @field_validator("tags", mode="before")
    @classmethod
    def validate_tags(cls, value):
        if value is None:
            return value
        return {short_name_validator(tag, field_name="tag") for tag in value}
        
    
class MachineBulkSpec(BaseModel):
    machine_config: CreateMachineForm
    machine_count: int
    
    @field_validator("machine_count", mode="before")
    @classmethod
    def validate_machine_count(cls, value):
        return int_validator(value=value, min_value=1, field_name="machine_count")
    
    
class ModifyMachineForm(BaseModel):
    title: str | None = None
    description: str | None = None
    tags: set[str] | None = None
    
    assigned_clients: set[UUID] | None = None
    
    config: CreateMachineFormConfig | None = None
    disks: list[CreateMachineFormDisk] | None = None
    
    internet_connectivity: bool | None = None
    
    @field_validator("title", mode="before")
    @classmethod
    def validate_title(cls, value):
        if value is None:
            return None
        return name_validator(value=value, field_name="title")
        
    @field_validator("description", mode="before")
    @classmethod
    def validate_description(cls, value):
        if value is None:
            return None
        return description_validator(value)   
    
    @field_validator("tags", mode="before")
    @classmethod
    def validate_tags(cls, value):
        if value is None:
            return None
        return {short_name_validator(tag, field_name="tag") for tag in value}