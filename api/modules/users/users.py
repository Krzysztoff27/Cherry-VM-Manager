
import logging
import re
from typing import Any, Optional
from uuid import UUID

from fastapi import HTTPException

from config.permissions_config import PERMISSIONS
from config.regex_config import REGEX_CONFIG
from modules.postgresql.main import async_pool, pool
from modules.authentication.passwords import hash_password
from modules.postgresql.simple_select import select_single_field
from modules.users.guacamole_synchronization import create_entity
from modules.users.permissions import verify_can_change_password, verify_permissions
from modules.users.sublibraries.roles_manager import RoleManager
from modules.users.sublibraries.group_manager import GroupManager
from modules.users.sublibraries.client_manager import ClientManager
from modules.users.sublibraries.administrator_manager import AdministratorManager
from modules.users.validation import validate_group_creation, validate_user_creation, validate_user_modification
from .models import Administrator, AnyUser, AnyUserExtended, CreateAdministratorArgs, CreateAnyUserForm, CreateClientArgs, CreateGroupArgs, CreateGroupForm, GetUsersFilters, ModifyUserArgs, ModifyUserForm

logger = logging.getLogger(__name__)

class _UsersSystemManager():
    
    def get_user(self, uuid: UUID) -> Optional[AnyUser]:
        return AdministratorManager.get_record_by_uuid(uuid) or ClientManager.get_record_by_uuid(uuid)
    
    def get_user_by_username(self, username: str) -> Optional[AnyUser]:
        return AdministratorManager.get_record_by_field("username", username) or ClientManager.get_record_by_field("username", username)
    
    def get_user_by_email(self, email: str) -> Optional[AnyUser]:
        return AdministratorManager.get_record_by_field("email", email) or ClientManager.get_record_by_field("email", email)
    
    def get_user_password(self, uuid: UUID) -> Optional[str]:
        return AdministratorManager.get_password(uuid) or ClientManager.get_password(uuid)
    
    def get_users(self, filters: GetUsersFilters) -> dict[UUID, AnyUser]:
        users: dict[UUID, AnyUser] = {}
        
        if filters.role is not None and filters.group is not None:
            return {}
            
        if filters.account_type in (None, "administrative") and filters.group is None:
            if filters.role is None:
                users |= AdministratorManager.get_all_records()
            else:
                users |= AdministratorManager.get_all_administrators_with_role(filters.role)

        if filters.account_type in (None, "client") and filters.role is None:
            if filters.group is None:
                users |= ClientManager.get_all_records()
            else:
                users |= ClientManager.get_all_clients_in_group(filters.group)
        
        return users
    
    def extend_user_model(self, user: AnyUser) -> AnyUserExtended:
        if user.account_type == 'administrative':
            return AdministratorManager.extend_model(user)
        if user.account_type == 'client':
            return ClientManager.extend_model(user)
    
    def create_user(self, form: CreateAnyUserForm, logged_in_user: Administrator) -> UUID:                      
        validate_user_creation(form)
        
        if form.account_type == 'administrative':
            verify_permissions(logged_in_user, PERMISSIONS.MANAGE_ADMIN_USERS)
        elif form.account_type == 'client':
            verify_permissions(logged_in_user, PERMISSIONS.MANAGE_CLIENT_USERS)
        
        if form.account_type == 'administrative':                       
            return AdministratorManager.create_record(CreateAdministratorArgs.model_validate(form.model_dump()), logged_in_user)
        if form.account_type == 'client':
            return ClientManager.create_record(CreateClientArgs.model_validate(form.model_dump()))
        
    async def create_users(self, forms: list[CreateAnyUserForm], logged_in_user: Administrator):
        usernames = []
        emails = []
        administrators_args_list = []
        clients_args_list = []
        
        logger.info("[create-users-in-bulk] Validating data")
        for form in forms:
            validate_user_creation(form)
            usernames.append(form.username)
            
            if form.email is not None:
                emails.append(form.email)

            if form.account_type == "administrative":
                administrators_args_list.append(CreateAdministratorArgs.model_validate(form.model_dump()))
            elif form.account_type == "client":
                clients_args_list.append(CreateClientArgs.model_validate(form.model_dump()))
            
        if len(usernames) != len(set(usernames)):
            raise HTTPException(409, f"Request contains duplicate usernames.") 
        if len(emails) != len(set(emails)):
            raise HTTPException(409, f"Request contains duplicate emails.") 
        if len(administrators_args_list):
            verify_permissions(logged_in_user, PERMISSIONS.MANAGE_ADMIN_USERS)
        if len(clients_args_list):
            verify_permissions(logged_in_user, PERMISSIONS.MANAGE_CLIENT_USERS)
        
        
        logger.info(f"[create-users-in-bulk] Validation complete. Found {len(administrators_args_list)} administrators and {len(clients_args_list)} clients.")
        
        async with async_pool.connection() as connection:
            async with connection.cursor() as cursor:
                async with connection.transaction():
                    logger.info("[create-users-in-bulk] Connected to the DB")
                    try:
                        if administrators_args_list:
                            await AdministratorManager.create_records(administrators_args_list, logged_in_user, cursor)
                        if clients_args_list:
                            await ClientManager.create_records(clients_args_list, cursor)
                        
                    except Exception as e:
                        logger.exception("Error creating users in bulk")
                        raise HTTPException(500, "An error occurred while creating users in bulk.")

        with pool.connection() as connection:
            with connection.cursor() as cursor:
                for args in [*administrators_args_list, *clients_args_list]:
                    create_entity(cursor, args.uuid)

        logger.info("[create-users-in-bulk] Creation completed")
     
    def delete_user(self, uuid: UUID, logged_in_user: Administrator):
        user = self.get_user(uuid)
        
        if user is None:
            raise HTTPException(400, f"User with UUID={uuid} does not exist.")
        
        if user.account_type == 'administrative':
            verify_permissions(logged_in_user, PERMISSIONS.MANAGE_ADMIN_USERS)
            return AdministratorManager.remove_record(uuid)
        if user.account_type == 'client':
            verify_permissions(logged_in_user, PERMISSIONS.MANAGE_CLIENT_USERS)
            return ClientManager.remove_record(uuid)
        
    def delete_users(self, uuids: list[UUID],  logged_in_user: Administrator):
        all_administrator_uuids = set(select_single_field("uuid", "SELECT uuid FROM administrators"))
        all_client_uuids = set(select_single_field("uuid", "SELECT uuid FROM clients"))
        
        uuids_to_delete = set(uuids)
        administrator_uuids_to_delete = list(uuids_to_delete & all_administrator_uuids)
        client_uuids_to_delete = list(uuids_to_delete & all_client_uuids)
     
        with pool.connection() as connection:
            with connection.cursor() as cursor:
                with connection.transaction():
                    try: 
                        if administrator_uuids_to_delete:
                            verify_permissions(logged_in_user, PERMISSIONS.MANAGE_ADMIN_USERS)
                            
                            AdministratorManager.remove_records(administrator_uuids_to_delete, cursor)
                            if not RoleManager.verify_role_integrity(cursor):
                                connection.rollback()
                                raise HTTPException(
                                    400,
                                    "Cannot remove selected users, as it would leave at least one permission unassigned. "
                                    "Please assign the affected permission to another user before proceeding."
                                )

                        if client_uuids_to_delete:
                            verify_permissions(logged_in_user, PERMISSIONS.MANAGE_CLIENT_USERS)
                            ClientManager.remove_records(client_uuids_to_delete, cursor)
                    except Exception:
                        logger.exception("Error occurred during bulk removal of users.")
                        raise HTTPException(500, "Error occurred during bulk removal of users.")
        
        
    def modify_user(self, uuid: UUID, form: ModifyUserForm, logged_in_user: Administrator) -> AnyUser | None:
        user = self.get_user(uuid)
        
        if user is None:
            raise HTTPException(400, f"User with UUID={uuid} does not exist.")
        
        if user.account_type == 'administrative':
            verify_permissions(logged_in_user, PERMISSIONS.MANAGE_ADMIN_USERS)
        elif user.account_type == 'client':
            verify_permissions(logged_in_user, PERMISSIONS.MANAGE_CLIENT_USERS)
        
        validate_user_modification(uuid, form)
        
        args = ModifyUserArgs.model_validate(form.model_dump())
        
        if user.account_type == 'administrative':
            if form.roles: 
                RoleManager.update_administrator_roles(uuid, form.roles, logged_in_user)
                
            AdministratorManager.modify_record(uuid, args)
        
        elif user.account_type == 'client':
            if form.groups: 
                GroupManager.update_client_groups(uuid, form.groups)
            
            ClientManager.modify_record(uuid, args)
        
        return self.get_user(uuid)
        
    def change_password(self, uuid: UUID, new_password: str, logged_in_user: Administrator):
        user = self.get_user(uuid)
        
        if user is None:
            raise HTTPException(400, f"User with UUID={uuid} does not exist.")
        
        if not re.match(REGEX_CONFIG.password, new_password):
            raise HTTPException(status_code=400, detail="Invalid password. Password must be at least 12 characters long and contain at least one digit, lowercase letter, upercase letter and one of the special characters.") 
    
        verify_can_change_password(logged_in_user, user)
    
        hashed_password = hash_password(new_password)
    
        if user.account_type == 'administrative':
            return AdministratorManager.change_password(uuid, hashed_password)
        if user.account_type == 'client':
            return ClientManager.change_password(uuid, hashed_password)
        
    def update_user_last_active(self, logged_in_user: AnyUser):
        if logged_in_user.account_type == 'administrative':
            return AdministratorManager.update_last_active(logged_in_user.uuid)
        if logged_in_user.account_type == 'client':
            return ClientManager.update_last_active(logged_in_user.uuid)
        
    def create_group(self, form: CreateGroupForm) -> UUID:
        validate_group_creation(form)
        
        return GroupManager.create_record(CreateGroupArgs.model_validate(form.model_dump()))

    
UsersManager = _UsersSystemManager()

__all__ = ["UsersManager"]