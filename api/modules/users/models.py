import datetime as dt
from typing import Literal, Union
from uuid import UUID, uuid4
from pydantic import BaseModel, field_validator, model_validator
from pydantic import BaseModel, field_validator
from uuid import UUID, uuid4

from modules.global_models.models import UUIDModel
from modules.validation.string import lenient_name_validator, name_validator, username_validator


# 
#   BASE TYPES
# 

AccountType = Literal["administrative", "client"]

# 
#   DATABASE MODELS
# 
class AdministratorInDB(BaseModel):
    uuid: UUID
    username: str
    email: str | None = None
    name: str | None = None
    surname: str | None = None
    creation_date: dt.date = dt.date.today()
    last_active: dt.datetime | None = None
    disabled: bool = False
    
class ClientInDB(BaseModel):
    uuid: UUID
    username: str
    email: str | None = None
    name: str | None = None
    surname: str | None = None
    creation_date: dt.date = dt.date.today()
    last_active: dt.datetime | None = None
    disabled: bool = False

class RoleInDB(BaseModel):
    uuid: UUID
    name: str
    permissions: int


class GroupInDB(BaseModel):
    uuid: UUID
    name: str
    
    
# 
#   BASE MODELS
# 

class Administrator(BaseModel):
    uuid: UUID
    username: str
    email: str | None = None
    name: str | None = None
    surname: str | None = None
    creation_date: dt.date = dt.date.today()
    last_active: dt.datetime | None = None
    disabled: bool = False
    account_type: Literal["administrative"] = "administrative"
    roles: list[UUID] = []
    permissions: int = 0


class Client(BaseModel):
    uuid: UUID
    username: str
    email: str | None = None
    name: str | None = None
    surname: str | None = None
    creation_date: dt.date = dt.date.today()
    last_active: dt.datetime | None = None
    disabled: bool = False
    account_type: Literal["client"] = "client"
    groups: list[UUID] = []

class Role(BaseModel):
    uuid: UUID
    name: str
    permissions: int
    users: list[UUID] = []
    
class Group(BaseModel):
    uuid: UUID
    name: str
    users: list[UUID] = []
    
# 
#   EXTENDED MODELS
# 

class AdministratorExtended(Administrator):
    roles: dict[UUID, Role] = {}
    
    
class ClientExtended(Client):
    groups: dict[UUID, Group] = {}

class RoleExtended(Role):
    users: dict[UUID, Administrator] = {}

class GroupExtended(Group):
    users: dict[UUID, Client] = {}
    

# 
#   FORMS
# 

class GetUsersFilters(BaseModel):
    account_type: AccountType | None = None
    role: UUID | None = None
    group: UUID | None = None


class UserFormBasicModel(BaseModel):
    username: str
    name: str | None = None
    surname: str | None = None
    email: str | None = None

    
    @field_validator("username", mode="before")
    @classmethod
    def validate_username(cls, value):
        return username_validator(value)
    
    @field_validator("name", mode="before")
    @classmethod
    def validate_name(cls, value):
        if value is not None and len(value):
            return lenient_name_validator(value)
        return None
    
    @field_validator("surname", mode="before")
    @classmethod
    def validate_surname(cls, value):
        if value is not None and len(value):
            return lenient_name_validator(value, field_name="surname")
        return None
    
    @field_validator("email", mode="before")
    @classmethod
    def fix_email(cls, value):
        if value is not None and len(value):
            return value.lower()
        return None

class CreateAdministratorForm(UserFormBasicModel):
    password: str
    username: str
    email: str | None = None
    name: str | None = None
    surname: str | None = None
    disabled: bool = False
    account_type: Literal["administrative"] = "administrative"
    roles: list[UUID] = []
    
class CreateClientForm(UserFormBasicModel):
    password: str
    username: str
    email: str | None = None
    name: str | None = None
    surname: str | None = None
    disabled: bool = False
    account_type: Literal["client"] = "client"
    groups: list[UUID] = []
    
class CreateGroupForm(BaseModel):
    name: str
    users: list[UUID]
    
    @field_validator("name", mode="before")
    @classmethod
    def validate_name(cls, value):
        return name_validator(value)

class ModifyUserForm(UserFormBasicModel):
    username: str | None = None
    email: str | None = None
    name: str | None = None
    surname: str | None = None
    roles: list[UUID] | None = None
    groups: list[UUID] | None = None
    disabled: bool | None = None
    
class ModifyUserArgs(BaseModel):
    username: str | None = None
    email: str | None = None
    name: str | None = None
    surname: str | None = None
    disabled: bool | None = None

class CreateAdministratorArgs(CreateAdministratorForm, UUIDModel):
    pass
    
class CreateClientArgs(CreateClientForm, UUIDModel):
    pass
    
class CreateGroupArgs(CreateGroupForm, UUIDModel):
    pass

class ChangePasswordBody(BaseModel):
    password: str
    
class RenameGroupBody (BaseModel):
    name: str
    
    @field_validator("name", mode="before")
    @classmethod
    def validate_name(cls, value):
        return name_validator(value)

# 
#   UNIONS
# 

AnyUserInDB = Union[AdministratorInDB, ClientInDB]
AnyUser = Union[Administrator, Client]
AnyUserExtended = Union[AdministratorExtended, ClientExtended]
CreateAnyUserForm = Union[CreateAdministratorForm, CreateClientForm]