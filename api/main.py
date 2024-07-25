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

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # allow local origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

################################
# authentication & authorization
################################

class Token(BaseModel):
    access_token: str
    token_type: str

class User(BaseModel):
    uid: int
    username: str
    full_name: str | None = None

load_dotenv()

SECRET_KEY = getenv('SECRET_KEY')
ALGORITHM = getenv('ALGORITHM')
ACCESS_TOKEN_EXPIRE_MINUTES = int(getenv('ACCESS_TOKEN_EXPIRE_MINUTES', default=5))
ACCESS_GROUP_GID = int(getenv('ACCESS_GROUP_GID') or 0) or None

if not SECRET_KEY or not ALGORITHM:
    raise Exception('[!] SECRET_KEY or ALGORITHM not set in the .env configuration')

logging.getLogger('passlib').setLevel(logging.ERROR) # silence the error caused by a bug in the bcrypt package

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_user(username):
    try:
        user = pwd.getpwnam(username)
        return User(uid=user.pw_uid, username=user.pw_name, full_name=user.pw_gecos)
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

################################
# auth requests
################################

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

@app.get("/user", response_model=User)
async def read_users_me(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    return current_user

###############################
#       data requests
###############################

class VirtualMachine(BaseModel):            # * parent class with properties needed in every request
    id: int                                 # unique ID for each machine
    group: str | None = None                # string of a corresponding machine group e.g.: "Desktop" or "Server"
    group_member_id: int | None = None      # unique ID for each machine in the scope of a group

class MachineNetworkData(VirtualMachine):   # * this data will be requested once per page load
    port: int | None = None                 # transport layer port used by the VM
    domain: str | None = None               # proxy domain for the VM Apache Guacamole site
    active_connections: list | None = None  # if possible, list of IP addresses 
    # ... add more if required

class MachineState(VirtualMachine):         # * when displaying this data will be requested by the website every 1-3s
    active: bool = False                    # is the machine online?
    cpu: int = 0                            # ∈ <0,100> % of CPU usage
    ram_max: int | None = None              # RAM assigned to the VM in MB
    ram_used: int | None = None             # RAM used by the VM in MB
    # ... the more the better

@app.get("/vm/all/networkdata") # * request for network data of all VMs
async def get_all_vms_network_data(
    current_user: Annotated[User, Depends(get_current_user)], # ! provides authentication, no need to do anything with it
) -> dict[int, MachineNetworkData]:
    # ...
    # ... code here
    # ...
    # example return:
    return {
        1: MachineNetworkData(id=1, group='desktop', group_member_id=1, port=1001, domain='desktop1.wisniowa.oedu.pl'),
        2: MachineNetworkData(id=2, group='desktop', group_member_id=2, port=1002, domain='desktop2.wisniowa.oedu.pl'),
        # ...
        17: MachineNetworkData(id=17, group='serwer',  group_member_id=1, port=1501, domain='serwer1.wisniowa.oedu.pl'),
        18: MachineNetworkData(id=18, group='serwer',  group_member_id=2, port=1502, domain='serwer2.wisniowa.oedu.pl'),
        # ...
    }
    

@app.get("/vm/all/state") # * request for state of all VMs
async def get_all_vms_state(
    current_user: Annotated[User, Depends(get_current_user)], # ! -"-
) -> dict[int, MachineState]:
    # ...
    # ... code here
    # ...
    # example return:
    return {
        1: MachineState(id=1, group='desktop', active=True, group_member_id=1, cpu=42, ram_used=3462, ram_max=4096),
        2: MachineState(id=2, group='desktop', active=False, group_member_id=2),
        # ...
        17: MachineState(id=17, group='serwer',  active=False, group_member_id=1),
        18: MachineState(id=18, group='serwer',  active=True, group_member_id=2, cpu=97, ram_used=1094, ram_max=4096),
        # ...
    }

@app.get("/vm/{id}/networkdata") # * request for network data of VM with specific <id>
async def get_vm_network_data(
    id: int,
    current_user: Annotated[User, Depends(get_current_user)], # ! -"-
) -> MachineNetworkData: # 
    # ...
    # ... code here
    # ...
    # example return:
    return MachineNetworkData(id=id, group='desktop', group_member_id=1, port=1001, domain='desktop1.wisniowa.oedu.pl')

@app.get("/vm/{id}/state") # * request for network data of VM with specific <id>
async def get_vm_state(
    id: int,
    current_user: Annotated[User, Depends(get_current_user)], # ! -"-
) -> dict[int, MachineState]:
    # ...
    # ... code here
    # ...
    # example return:
    return MachineState(id=id, group='Desktop', group_member_id=1, active=True, cpu=42, ram_used=3462, ram_max=4096)