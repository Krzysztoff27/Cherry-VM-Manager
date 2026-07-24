import logging
from typing import Any, Type
from uuid import UUID

from fastapi import HTTPException
from psycopg import Cursor, sql
from modules.postgresql import pool

from ..models import Administrator, Role, RoleExtended, RoleInDB
from modules.users.permissions import has_permissions, verify_permission_integrity
from modules.postgresql.simple_table_manager import SimpleTableManager
from modules.postgresql.simple_select import select_single_field


logger = logging.getLogger(__name__)


def prepare_from_database_record(record: RoleInDB) -> Role:
    role = Role.model_validate(record.model_dump())
    
    role.users = select_single_field("uuid", """
        SELECT administrators.uuid FROM administrators
        JOIN administrators_roles ON administrators.uuid = administrators_roles.administrator_uuid
        JOIN roles ON administrators_roles.role_uuid = roles.uuid                            
        WHERE roles.uuid = %s
        """, (role.uuid, )   
    )
    
    return role

class _RoleTableManager(SimpleTableManager):
    model_extended: Type[RoleExtended] = RoleExtended
    
    def __init__(self):
        super().__init__(
            table_name="roles",
            allowed_fields_for_select={"uuid", "name"},
            model=Role,
            model_in_db=RoleInDB,
            model_creation_args=None,
            prepare_record=prepare_from_database_record,
        )
    
    def extend_model(self, role: Role) -> RoleExtended:
        from .administrator_manager import AdministratorManager
        
        return RoleExtended(
            **role.model_dump(exclude={"users"}),
            users=AdministratorManager.get_all_records_matching("uuid", role.users)
        )
        
    def verify_role_integrity(self, cursor: Cursor[Any]) -> bool:
        cursor.execute("""
            SELECT DISTINCT roles.* FROM administrators_roles
            LEFT JOIN roles ON administrators_roles.role_uuid = roles.uuid
        """)
        results = cursor.fetchall()
        assigned_roles = [RoleInDB.model_validate(row) for row in results]
        return verify_permission_integrity(assigned_roles)

    def assign_role_to_administrator(self, role_uuid: UUID, administrator_uuid: UUID, logged_in_user: Administrator):
        from .administrator_manager import AdministratorManager

        role: Role | None = self.get_record_by_uuid(role_uuid)
        administrator = AdministratorManager.get_record_by_uuid(administrator_uuid)
        
        if role is None:
            raise HTTPException(400, f"Role with uuid={role_uuid} does not exist.")
        if administrator is None:
            raise HTTPException(400, f"Administrator with uuid={administrator_uuid} does not exist.")
        if not has_permissions(logged_in_user, role.permissions):
            raise HTTPException(403, "You do not have necessary permissions to assign the attached role to another user.")
        
        with pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO administrators_roles (administrator_uuid, role_uuid) 
                    VALUES (%s, %s) 
                    ON CONFLICT DO NOTHING
                """, (administrator_uuid, role_uuid))  
    
    def remove_role_from_administrator(self, role_uuid: UUID, administrator_uuid: UUID, logged_in_user: Administrator):
        from .administrator_manager import AdministratorManager

        role = self.get_record_by_uuid(role_uuid)
        administrator = AdministratorManager.get_record_by_uuid(administrator_uuid)
        
        if role is None:
            raise HTTPException(400, f"Role with uuid={role_uuid} does not exist.")
        if administrator is None:
            raise HTTPException(400, f"Administrator with uuid={administrator_uuid} does not exist.")
        if not has_permissions(logged_in_user, role.permissions):
            raise HTTPException(403, "You do not have necessary permissions to revoke the attached role from another user.")
        
        with pool.connection() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    cursor.execute("""
                        DELETE FROM administrators_roles
                        WHERE administrator_uuid = %s AND role_uuid = %s
                    """, (administrator_uuid, role_uuid))  
                    
                    if not self.verify_role_integrity(cursor):
                        connection.rollback()
                        raise HTTPException(400, f"Cannot revoke role with UUID={role_uuid} from the user, as it would leave at least one permission unassigned. Please assign the affected permission to another user before proceeding.")

    def update_administrator_roles(self, administrator_uuid: UUID, roles: list[UUID], logged_in_user: Administrator):
        from .administrator_manager import AdministratorManager
        
        administrator = AdministratorManager.get_record_by_uuid(administrator_uuid)

        if administrator is None:
            raise HTTPException(400, f"Administrator with uuid={administrator_uuid} does not exist.")
        
        all_roles = set(self.get_all_records().keys())
        not_existing = set(roles) - all_roles
        
        if not_existing:
            raise HTTPException(400, f"The following roles do not exist in the system: {', '.join(map(str, not_existing))}")
        
        assigned_roles = RoleManager.get_all_records_matching("uuid", roles).values()
        
        required_permissions = 0
        
        for role in assigned_roles:
            required_permissions |= role.permissions
            
        if not has_permissions(logged_in_user, required_permissions):
            raise HTTPException(403, "You do not have necessary permissions to assign the attached set of roles to another user.")
        
        insert_query_placeholders = [
            sql.SQL("({}, {})").format(sql.Literal(administrator_uuid), sql.Literal(role_uuid))
            for role_uuid in roles
        ]
        
        insert_query = sql.SQL("""
            INSERT INTO administrators_roles (administrator_uuid, role_uuid)
            VALUES {values}
            ON CONFLICT DO NOTHING    
        """).format(values=sql.SQL(", ").join(insert_query_placeholders))
        
        with pool.connection() as connection:
            with connection.cursor() as cursor:
                with connection.transaction():
                    cursor.execute("DELETE FROM administrators_roles WHERE administrator_uuid = %s", (administrator_uuid, ))
                    cursor.execute(insert_query)
                    
                    if not self.verify_role_integrity(cursor):
                        connection.rollback()
                        raise HTTPException(400, f"The user’s roles could not be updated, as this change would result in at least one permission being left unassigned. Please assign the affected permission to another user before continuing.")
 
            

RoleManager = _RoleTableManager()

__all__ = ["RoleManager"]