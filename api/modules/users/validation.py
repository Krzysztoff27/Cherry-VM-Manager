import re
from uuid import UUID
from fastapi import HTTPException
from .models import CreateAnyUserForm, CreateGroupForm, ModifyUserForm
from config.regex_config import REGEX_CONFIG

def validate_user_creation(user_data: CreateAnyUserForm):   
    from .users import UsersManager
     
    if UsersManager.get_user_by_username(user_data.username) is not None:
        raise HTTPException(status_code=409, detail=f"User with username \"{user_data.username}\" already exists.")
    
    if user_data.email is not None and UsersManager.get_user_by_email(user_data.email) is not None:
        raise HTTPException(status_code=409, detail=f"User with email \"{user_data.email}\" already exists.")
    
    
def validate_group_creation(group_data: CreateGroupForm):
    from .sublibraries.group_manager import GroupManager
    
    if GroupManager.get_record_by_field("name", group_data.name) is not None:
        raise HTTPException(status_code=409, detail="Group with this name already exists")
    
    if len(group_data.name) > 50:
        raise HTTPException(status_code=400, detail="Name field cannot contain more than 50 characters.") 

        
    
def validate_user_modification(uuid: UUID, form: ModifyUserForm):
    from .users import UsersManager
    
    if form.username is not None:
        user_found_by_username = UsersManager.get_user_by_username(form.username)
        
        if user_found_by_username is not None and user_found_by_username.uuid != uuid:
            # If another user already exists with the same username (excluding the modified user), reject the update
            raise HTTPException(status_code=409, detail="User with this username already exists.")
        
        if not re.match(REGEX_CONFIG.username, form.username):
            raise HTTPException(status_code=400, detail="Invalid username. Username must be between 3 and 24 characters in length, start with a letter and only contain alphanumeric characters, underscores, hyphens and periods.")
    
    if form.email is not None:
        user_found_by_email = UsersManager.get_user_by_email(form.email)
        
        if user_found_by_email is not None and user_found_by_email.uuid != uuid:
            # If another user already exists with the same email (excluding the modified user), reject the update
            raise HTTPException(status_code=409, detail="User with this email already exists.")
    
    if form.name is not None and len(form.name) > 50:
        raise HTTPException(status_code=400, detail="Name field cannot contain more than 50 characters.")
    
    if form.surname is not None and len(form.surname) > 50:
        raise HTTPException(status_code=400, detail="Surname field cannot contain more than 50 characters.")
    