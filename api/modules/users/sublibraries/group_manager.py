import logging
from uuid import UUID
from typing import Type, override
from fastapi import HTTPException
from psycopg import sql
from modules.postgresql import pool
from modules.postgresql.simple_table_manager import SimpleTableManager
from modules.postgresql.simple_select import select_single_field
from ..models import CreateGroupArgs, CreateGroupForm, Group, GroupExtended, GroupInDB

logger = logging.getLogger(__name__)


def prepare_from_database_record(record: GroupInDB) -> Group:
    group = Group.model_validate(record.model_dump())
    
    group.users = select_single_field("uuid", """
        SELECT clients.uuid FROM clients
        JOIN clients_groups ON clients.uuid = clients_groups.client_uuid
        JOIN groups ON clients_groups.group_uuid = groups.uuid                          
        WHERE groups.uuid = %s
        """, (group.uuid, )   
    )
    
    return group


class _GroupTableManager(SimpleTableManager):
    model_extended: Type[GroupExtended] = GroupExtended
    
    def __init__(self):
        super().__init__(
            table_name="groups",
            allowed_fields_for_select={"uuid", "name"},
            model=Group,
            model_in_db=GroupInDB,
            model_creation_args=CreateGroupForm,
            prepare_record=prepare_from_database_record,
        )
    
    def extend_model(self, group: Group) -> GroupExtended:
        from .client_manager import ClientManager
        
        return GroupExtended(
            **group.model_dump(exclude={"users"}),
            users=ClientManager.get_all_records_matching("uuid", group.users)
        )
        
    @override
    def create_record(self, args: CreateGroupArgs) -> UUID:
        from .client_manager import ClientManager
        
        all_clients = set(ClientManager.get_all_records().keys())
        not_existing = set(args.users) - all_clients
        
        if not_existing:
            raise HTTPException(400, f"The following clients do not exist in the system: {', '.join(map(str, not_existing))}")
        
        assigned_users_query_placeholders = [
            sql.SQL("({}, {})").format(sql.Literal(user_uuid), sql.Literal(args.uuid))
            for user_uuid in args.users
        ]
        
        assign_users_query = sql.SQL("""
            INSERT INTO clients_groups (client_uuid, group_uuid)
            VALUES {values}
            ON CONFLICT DO NOTHING    
        """).format(values=sql.SQL(", ").join(assigned_users_query_placeholders))
        
        with pool.connection() as connection:
            with connection.cursor() as cursor:
                with connection.transaction():
                    cursor.execute("INSERT INTO groups (uuid, name) VALUES (%s, %s)", (args.uuid, args.name))
                    cursor.execute(assign_users_query)

        return args.uuid

    def join_client_to_group(self, group_uuid: UUID, client_uuid: UUID):
        from .client_manager import ClientManager
        
        group = self.get_record_by_uuid(group_uuid)
        client = ClientManager.get_record_by_uuid(client_uuid)
        
        if not group:
            raise HTTPException(400, f"Group with uuid={group_uuid} does not exist.")
        if not client:
            raise HTTPException(400, f"Client with uuid={client_uuid} does not exist.")
        
        with pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO clients_groups (client_uuid, group_uuid) 
                    VALUES (%s, %s) 
                    ON CONFLICT DO NOTHING
                """, (client_uuid, group_uuid))
                
    def remove_client_from_group(self, group_uuid: UUID, client_uuid: UUID):
        from .client_manager import ClientManager
        
        group = self.get_record_by_uuid(group_uuid)
        client = ClientManager.get_record_by_uuid(client_uuid)
        
        if group is None:
            raise HTTPException(400, f"Group with uuid={group_uuid} does not exist.")
        if client is None:
            raise HTTPException(400, f"Client with uuid={client_uuid} does not exist.")
        
        with pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("""
                    DELETE FROM clients_groups 
                    WHERE client_uuid = %s AND group_uuid = %s
                """, (client_uuid, group_uuid))
                
    def update_client_groups(self, client_uuid: UUID, groups: list[UUID]):
        from .client_manager import ClientManager
        
        client = ClientManager.get_record_by_uuid(client_uuid)
        
        if client is None:
            raise HTTPException(400, f"Client with uuid={client_uuid} does not exist.")
        
        all_groups = set(self.get_all_records().keys())
        not_existing = set(groups) - all_groups
        
        if not_existing:
            raise HTTPException(400, f"The following groups do not exist in the system: {', '.join(map(str, not_existing))}")
        
        insert_query_placeholders = [
            sql.SQL("({}, {})").format(sql.Literal(client_uuid), sql.Literal(group_uuid))
            for group_uuid in groups
        ]
        
        insert_query = sql.SQL("""
            INSERT INTO clients_groups (client_uuid, group_uuid)
            VALUES {values}
            ON CONFLICT DO NOTHING    
        """).format(values=sql.SQL(", ").join(insert_query_placeholders))
        
        with pool.connection() as connection:
            with connection.cursor() as cursor:
                with connection.transaction():
                    cursor.execute("DELETE FROM clients_groups WHERE client_uuid = %s", (client_uuid, ))
                    cursor.execute(insert_query)
        

GroupManager = _GroupTableManager()

__all__ = ["GroupManager"]