from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from jwt.exceptions import InvalidTokenError
from passlib.context import CryptContext
from pydantic import BaseModel

from datetime import datetime, timedelta, timezone
from typing import Annotated

from dotenv import load_dotenv
from os import getenv

import jwt, pwd, grp, pam, logging

load_dotenv()

try:
    SECRET_KEY = str(getenv('SECRET_KEY'))
    ALGORITHM = str(getenv('ALGORITHM'))
    ACCESS_TOKEN_EXPIRE_MINUTES = int(getenv('ACCESS_TOKEN_EXPIRE_MINUTES'))
    ACCESS_GROUP_GID = int(getenv('ACCESS_GROUP_GID'))
except:
    raise Exception('Lacking .env configuration')

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # allow local origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.getLogger('passlib').setLevel(logging.ERROR) # silence the error caused by a bug in the bcrypt package

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


class Token(BaseModel):
    access_token: str
    token_type: str

class User(BaseModel):
    username: str
    uid: int


def get_user(username):
    try:
        user = pwd.getpwnam(username)
        return User(username=user.pw_name, uid=user.pw_uid)
    except KeyError:
        return None
    

def is_user_in_access_group(username):
    try:
        if username in grp.getgrgid(ACCESS_GROUP_GID): 
            return True
        return False
    except:
        raise Exception('No access group GID set in the configuration')
    

def authenticate_user(username: str, password: str):
    authenticated = pam.authenticate(username, password)  
    if not authenticated:
        return False
    if not is_user_in_access_group(username):
        return False
    return get_user(username)


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
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
    except InvalidTokenError:
        raise credentials_exception
    
    user = get_user(username)
    if user is None:
        raise credentials_exception
    return user


@app.post("/token")
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> Token:
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return Token(access_token=access_token, token_type="bearer")
