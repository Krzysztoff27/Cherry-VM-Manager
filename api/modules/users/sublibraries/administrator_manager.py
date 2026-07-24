import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging
from typing import Any, Type, override
from uuid import UUID

from fastapi import HTTPException
from psycopg import AsyncCursor, Cursor, sql
from modules.users.permissions import has_permissions
from modules.postgresql import pool
from ..models import Administrator, AdministratorExtended, AdministratorInDB, CreateAdministratorArgs, ModifyUserArgs, Role
from modules.postgresql.simple_select import select_one, select_rows, select_single_field
from modules.users.guacamole_synchronization import create_entity, delete_entity
from modules.postgresql.simple_table_manager import SimpleTableManager
from modules.authentication.passwords import hash_password


logger = logging.getLogger(__name__)

_thread_pool = ThreadPoolExecutor(max_workers=4)

def prepare_from_database_record(record: AdministratorInDB) -> Administrator:
    administrator = Administrator.model_validate(record.model_dump())
    
    role_rows = select_rows("""
        SELECT roles.uuid, roles.permissions FROM roles
        JOIN administrators_roles ON roles.uuid = administrators_roles.role_uuid
        JOIN administrators ON administrators_roles.administrator_uuid = administrators.uuid
        WHERE administrators.uuid = %s
        """, (administrator.uuid,)
    )
    
    permissions = administrator.permissions
    roles: list[UUID] = []
    
    for row in role_rows:
        permissions |= row["permissions"]
        roles.append(row["uuid"])
        
    administrator.permissions = permissions
    administrator.roles = roles
        
    return administrator
    
class _AdministratorTableManager(SimpleTableManager):
    model_extended: Type[AdministratorExtended] = AdministratorExtended
    
    def __init__(self):
        super().__init__(
            table_name="administrators",
            allowed_fields_for_select={"uuid","username","email"},
            model=Administrator,
            model_in_db=AdministratorInDB,
            model_creation_args=CreateAdministratorArgs,
            prepare_record=prepare_from_database_record
        )
    
    def get_password(self, uuid: UUID) -> str | None:
        response = select_one("SELECT password FROM administrators WHERE uuid = %s", (uuid,))
        return response.get("password") if response else None
    
    def extend_model(self, administrator: Administrator) -> AdministratorExtended:
        from .roles_manager import RoleManager
        
        return AdministratorExtended(
            **administrator.model_dump(exclude={"roles"}),
            roles=RoleManager.get_all_records_matching("uuid", administrator.roles)
        )
        
    def get_all_administrators_with_role(self, role_uuid):
        administrator_uuids = select_single_field("uuid", """
            SELECT DISTINCT administrators.uuid FROM administrators 
            LEFT JOIN administrators_roles ON administrators.uuid = administrators_roles.administrator_uuid
            LEFT JOIN roles ON administrators_roles.role_uuid = roles.uuid
            WHERE role_uuid = %s
        """, (role_uuid, ))
        return self.get_all_records_matching("uuid", administrator_uuids)
        
    @override
    def create_record(self, args: CreateAdministratorArgs, logged_in_user: Administrator):
        from .roles_manager import RoleManager

        args.username = args.username.lower()
        args.password = hash_password(args.password)
        
        all_roles = set(RoleManager.get_all_records().keys())
        not_existing = set(args.roles) - all_roles
        
        if not_existing:
            raise HTTPException(400, f"The following roles do not exist in the system: {', '.join(map(str, not_existing))}")
        
        assigned_roles = RoleManager.get_all_records_matching("uuid", args.roles).values()
        
        required_permissions = 0
        
        for role in assigned_roles:
            required_permissions |= role.permissions
            
        if not has_permissions(logged_in_user, required_permissions):
            raise HTTPException(403, "You do not have necessary permissions to assign the attached set of roles to another user.")
        
        assigned_roles_query_placeholders = [
            sql.SQL("({}, {})").format(sql.Literal(args.uuid), sql.Literal(role_uuid))
            for role_uuid in args.roles
        ]
        
        assign_roles_query = sql.SQL("""
            INSERT INTO administrators_roles (administrator_uuid, role_uuid)
            VALUES {values}                       
            ON CONFLICT DO NOTHING
        """).format(values=sql.SQL(", ").join(assigned_roles_query_placeholders))
        
        with pool.connection() as connection:
            with connection.cursor() as cursor: 
                cursor.execute("""
                    INSERT INTO administrators (uuid, username, password, email, name, surname, disabled)
                    VALUES (%(uuid)s, %(username)s, %(password)s, %(email)s, %(name)s, %(surname)s, %(disabled)s)
                """, args.model_dump())
                if args.roles:
                    cursor.execute(assign_roles_query)
                
                create_entity(cursor, args.uuid)
        
        return args.uuid
    
    async def create_records(self, args_list: list[CreateAdministratorArgs], logged_in_user: Administrator, cursor: AsyncCursor[Any]):
        from .roles_manager import RoleManager
        
        all_roles: dict[UUID, Role] = RoleManager.get_all_records()
        all_role_uuids = set(all_roles.keys())
        
        required_permissions = 0
        roles_query_data = []
        
        loop = asyncio.get_event_loop()
        passwords = [args.password for args in args_list]
        hash_tasks = [
            loop.run_in_executor(_thread_pool, hash_password, pw) 
            for pw in passwords
        ]
        hashed_passwords = await asyncio.gather(*hash_tasks)
        
        for args, hashed_password in zip(args_list, hashed_passwords):
            args.username = args.username.lower()
            args.password = hashed_password
         
            for role_uuid in args.roles:
                if not role_uuid in all_role_uuids:
                    raise HTTPException(400, f"The following role does not exist in the system: {role_uuid}")
                
                required_permissions |= all_roles[role_uuid].permissions
                roles_query_data.append({"administrator_uuid": args.uuid, "role_uuid": role_uuid})
                
        if not has_permissions(logged_in_user, required_permissions):
            raise HTTPException(403, "You do not have necessary permissions to assign the attached set of roles to another user.")
        
        data = [args.model_dump() for args in args_list]
        
        logger.info("[create-users-in-bulk] Creating administrative users in bulk.")
        await cursor.executemany("""
             INSERT INTO administrators (uuid, username, password, email, name, surname, disabled) 
             VALUES (%(uuid)s, %(username)s, %(password)s, %(email)s, %(name)s, %(surname)s, %(disabled)s)              
        """, data)
        
        logger.info("[create-users-in-bulk] Assigning roles to newly created administrators.")
        if roles_query_data:
            await cursor.executemany("""
                INSERT INTO administrators_roles (client_uuid, group_uuid) 
                VALUES (%(client_uuid)s, %(group_uuid)s)
            """, roles_query_data)
    
    @override
    def remove_record(self, uuid: UUID):
        from .roles_manager import RoleManager

        with pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM administrators WHERE uuid = %s", (uuid,))
                
                if not RoleManager.verify_role_integrity(cursor):
                    connection.rollback()
                    raise HTTPException(
                        400, f"""
                        Cannot remove user with UUID={uuid}, as it would leave at least one permission unassigned.
                        Please assign the affected permission to another user before proceeding."""
                    )
                
                delete_entity(cursor, uuid)
                connection.commit()
                
    def remove_records(self, uuids: list[UUID], cursor: Cursor[Any]):
        cursor.execute("DELETE FROM administrators WHERE uuid = ANY(%s)",(uuids,))
        
        for uuid in uuids:
            delete_entity(cursor, uuid)

    
    def modify_record(self, uuid: UUID, form: ModifyUserArgs):
        
        fields = []
        values = []
        
        for field, value in form.model_dump(exclude_none=True).items():
            fields.append(sql.SQL("{} = %s").format(sql.Identifier(field)))
            values.append(value)
            
        if not fields:
            return
        
        query = sql.SQL("UPDATE administrators SET {fields} WHERE uuid = %s").format(fields=sql.SQL(", ").join(fields))
        
        values.append(uuid)
        
        with pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(query, values)

    def change_password(self, uuid: UUID, hashed_password: str):
        with pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("UPDATE administrators SET password = %s WHERE uuid = %s", (hashed_password, uuid,))

    def update_last_active(self, uuid: UUID):
        with pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("UPDATE administrators SET last_active = CURRENT_TIMESTAMP WHERE uuid = %s", (uuid,))
    
AdministratorManager = _AdministratorTableManager()

__all__ = ["AdministratorManager"]