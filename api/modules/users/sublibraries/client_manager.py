import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging
import time
from typing import Any, Type, override
from uuid import UUID
from fastapi import HTTPException
from psycopg import AsyncCursor, Cursor, sql

from modules.authentication.passwords import hash_password
from modules.postgresql import pool
from modules.postgresql.simple_table_manager import SimpleTableManager
from modules.postgresql.simple_select import select_one, select_single_field
from modules.users.guacamole_synchronization import create_entity, delete_entity

from ..models import Client, ClientExtended, ClientInDB, CreateClientArgs, ModifyUserArgs


logger = logging.getLogger(__name__)

_thread_pool = ThreadPoolExecutor(max_workers=4)

def prepare_from_database_record(record: ClientInDB) -> Client:
    client = Client.model_validate(record.model_dump())
    
    client.groups = select_single_field("uuid", """
        SELECT groups.uuid FROM groups
        JOIN clients_groups ON groups.uuid = clients_groups.group_uuid
        JOIN clients ON clients_groups.client_uuid = clients.uuid
        WHERE clients.uuid = %s
        """, (client.uuid,)
    )
    
    return client


class _ClientTableManager(SimpleTableManager):
    model_extended: Type[ClientExtended] = ClientExtended
    
    def __init__(self):
        super().__init__(
            table_name="clients",
            allowed_fields_for_select={"uuid","username","email"},
            model=Client,
            model_in_db=ClientInDB,
            model_creation_args=CreateClientArgs,
            prepare_record=prepare_from_database_record
        )
    
    def get_password(self, uuid: UUID) -> str | None:
        response = select_one("SELECT password FROM clients WHERE uuid = %s", (uuid,))
        return response.get("password") if response else None

    def extend_model(self, client: Client) -> ClientExtended:
        from .group_manager import GroupManager
        
        return ClientExtended(
            **client.model_dump(exclude={"groups"}),
            groups=GroupManager.get_all_records_matching("uuid", client.groups)
        )
        
    def get_all_clients_in_group(self, group_uuid):
        client_uuids = select_single_field("uuid", """
            SELECT DISTINCT clients.uuid FROM clients
            LEFT JOIN clients_groups ON clients.uuid = clients_groups.client_uuid
            LEFT JOIN groups ON clients_groups.group_uuid = groups.uuid
            WHERE group_uuid = %s
        """, (group_uuid, ))
        return self.get_all_records_matching("uuid", client_uuids)
        
    @override
    def create_record(self, args: CreateClientArgs):
        from .group_manager import GroupManager

        args.username = args.username.lower()
        args.password = hash_password(args.password)
        
        all_groups = set(GroupManager.get_all_records().keys())
        not_existing = set(args.groups) - all_groups
        
        if not_existing:
            raise HTTPException(400, f"The following groups do not exist in the system: {', '.join(map(str, not_existing))}")
        
        assigned_groups_query_placeholder = [
            sql.SQL("({}, {})").format(sql.Literal(args.uuid), sql.Literal(group_uuid))
            for group_uuid in args.groups
        ]
        
        assign_groups_query = sql.SQL("""
            INSERT INTO clients_groups (client_uuid, group_uuid)
            VALUES {values}                       
            ON CONFLICT DO NOTHING
        """).format(values=sql.SQL(", ").join(assigned_groups_query_placeholder))
        
        with pool.connection() as connection:
            with connection.cursor() as cursor: 
                cursor.execute("""
                    INSERT INTO clients (uuid, username, password, email, name, surname, disabled)
                    VALUES (%(uuid)s, %(username)s, %(password)s, %(email)s, %(name)s, %(surname)s, %(disabled)s)
                """, args.model_dump())
                if args.groups:
                    cursor.execute(assign_groups_query)
                
                create_entity(cursor, args.uuid)
        
        return args.uuid
    
    async def create_records(self, args_list: list[CreateClientArgs], cursor: AsyncCursor[Any]):
        from .group_manager import GroupManager
        
        all_groups = GroupManager.get_all_records()
        all_group_uuids = set(all_groups.keys())
        
        groups_query_data = []
        
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
            
            for group_uuid in args.groups:
                if not group_uuid in all_group_uuids:
                    raise HTTPException(400, f"The following group does not exist in the system: {group_uuid}")
                
                groups_query_data.append({"client_uuid": args.uuid, "group_uuid": group_uuid})
        
        data = [args.model_dump() for args in args_list]
        
        logging.info("[create-users-in-bulk] Creating client users in bulk.")
        await cursor.executemany("""
             INSERT INTO clients (uuid, username, password, email, name, surname, disabled) 
             VALUES (%(uuid)s, %(username)s, %(password)s, %(email)s, %(name)s, %(surname)s, %(disabled)s)              
        """, data)
        
        logging.info("[create-users-in-bulk] Assigning newly created clients to groups.")
        if groups_query_data:
            await cursor.executemany("""
                INSERT INTO clients_groups (client_uuid, group_uuid) 
                VALUES (%(client_uuid)s, %(group_uuid)s)
            """, groups_query_data)
    
    @override
    def remove_record(self, uuid: UUID):
        with pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM clients WHERE uuid = %s", (uuid,))
                delete_entity(cursor, uuid)
                connection.commit()
                
    def remove_records(self, uuids: list[UUID], cursor: Cursor[Any]):
        cursor.execute("DELETE FROM clients WHERE uuid = ANY(%s)", (uuids,))
        
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
        
        query = sql.SQL("UPDATE clients SET {fields} WHERE uuid = %s").format(fields=sql.SQL(", ").join(fields))
        
        values.append(uuid)
        
        with pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(query, values)
    
    def change_password(self, uuid: UUID, hashed_password: str):
        with pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("UPDATE clients SET password = %s WHERE uuid = %s", (hashed_password, uuid,))
                
    def update_last_active(self, uuid: UUID):
        with pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("UPDATE clients SET last_active = CURRENT_TIMESTAMP WHERE uuid = %s", (uuid,))
    
        
ClientManager = _ClientTableManager()

__all__ = ["ClientManager"]