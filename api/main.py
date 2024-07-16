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

SECRET_KEY = getenv('SECRET_KEY')
ALGORITHM = getenv('ALGORITHM')
ACCESS_TOKEN_EXPIRE_MINUTES = int(getenv('ACCESS_TOKEN_EXPIRE_MINUTES', default=5))
ACCESS_GROUP_GID = int(getenv('ACCESS_GROUP_GID') or 0) or None

if not SECRET_KEY or not ALGORITHM:
    raise Exception('[!] SECRET_KEY or ALGORITHM not set in the .env configuration')

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

################################
# authentication & authorization
################################

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
    

def is_user_in_access_group(username: str):
    if not ACCESS_GROUP_GID: 
        return True
    group_members = grp.getgrgid(ACCESS_GROUP_GID).gr_mem
    try:
        if username in group_members:
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


################################
# requests
################################

class VM_Data(BaseModel):
    name: str | None = None
    port: int | None = None
    # add more parameters here

@app.post("/vm") # request for data of all VMs
async def get_all_vms_data(
    current_user: Annotated[User, Depends(get_current_user)], # added for authentication, if not logged in the exception would be raised and the function won't execute
) -> dict[int, VM_Data]: # should return a dictionary of virtual machine data objects
    # ...
    # ...
    # ...
    # example return:
    return {
        1: VM_Data(name='Desktop 1', port=1337),
        2: VM_Data(name='Server 1', port=6969),
        3: VM_Data(name='Desktop 2'),
        #...
    }

@app.post("/vm/{id}") # request for data of a specific VM
async def get_vm_data(
    id: int,
    current_user: Annotated[User, Depends(get_current_user)],
) -> VM_Data: # returns a singular virtual machine data object
    # ...
    # ...
    # ...
    # example return:
    return VM_Data(name=f'Desktop {id}', port=id * 1000)