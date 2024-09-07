from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from passlib.context import CryptContext
from pydantic import BaseModel

from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt, pwd, grp, pam, logging

from main import SECRET_KEY, ALGORITHM, ACCESS_GROUP_GID

###############################
#           schemes
###############################

logging.getLogger('passlib').setLevel(logging.ERROR) # silence the error caused by a bug in the bcrypt package
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

###############################
#           classes
###############################

class Token(BaseModel):
    access_token: str
    token_type: str

class User(BaseModel):
    uid: int
    username: str
    full_name: str | None = None

###############################
#       auth functions
###############################

def get_user_from_pam(username) -> User | None:
    try:
        user = pwd.getpwnam(username)
        return User(uid=user.pw_uid, username=user.pw_name, full_name=user.pw_gecos)
    except KeyError:
        return None
    

def is_user_in_access_group(username: str) -> bool:
    if not ACCESS_GROUP_GID: 
        return True
    group_members = grp.getgrgid(ACCESS_GROUP_GID).gr_mem
    try:
        if username in group_members:
            return True
        return False
    except:
        raise Exception('Group with GID set in configuration does not exist.')
    

def authenticate_user(username: str, password: str):
    authenticated = pam.authenticate(username, password)
    if not authenticated:
        return False
    return get_user_from_pam(username)


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
    except InvalidTokenError:
        raise credentials_exception
    
    user = get_user_from_pam(username)
    if user is None:
        raise credentials_exception
    return user

async def get_authorized_user(token: Annotated[str, Depends(oauth2_scheme)]):
    user = await get_current_user(token)
    if not is_user_in_access_group(user.username):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not belong to the access group."
        )
    return user