from fastapi import Depends
from pydantic import BaseModel
from typing import Annotated

from main import app
from auth import get_current_user, User

###############################
#           classes
###############################

class VirtualMachine(BaseModel):            # * parent class with properties needed in every request
    id: int                                 # unique ID for each machine
    group: str | None = None                # string of a corresponding machine group e.g.: "Desktop" or "Server"
    group_member_id: int | None = None      # unique ID for each machine in the scope of a group

class MachineNetworkData(VirtualMachine):   # * this data will be requested once per page load
    port: int | None = None                 # transport layer port used by the VM
    domain: str | None = None               # proxy domain for the VM Apache Guacamole site
    # ... add more if required

class MachineState(VirtualMachine):         # * when displaying a page needing this data, it will be requested every 1-3s
    active: bool = False                    # is the machine online?
    loading: bool = False                   # is the machine loading (in a state between online and offline)
    active_connections: list | None = None  # if possible, list of IP addresses 
    cpu: int = 0                            # ∈ <0,100> % of CPU usage
    ram_max: int | None = None              # RAM assigned to the VM in MB
    ram_used: int | None = None             # RAM used by the VM in MB
    # ... the more the better

###############################
#       data requests
###############################

from requests.dummies import NETWORK_DATA_DUMMY, STATE_DUMMY
import random

@app.get("/vm/all/networkdata") # * request for network data of all VMs
async def get_all_vms_network_data(
    current_user: Annotated[User, Depends(get_current_user)], # ! provides authentication, no need to do anything with it
) -> dict[int, MachineNetworkData]:
    # ...
    # ... code here
    # ...
    # example return:
    return NETWORK_DATA_DUMMY
    

@app.get("/vm/all/state") # * request for state of all VMs
async def get_all_vms_state(
    current_user: Annotated[User, Depends(get_current_user)], # ! -"-
) -> dict[int, MachineState]:
    # ...
    # ... code here
    # ...
    # example return:
    states = STATE_DUMMY
    for i in states:
        if not states[i].active: continue
        states[i].cpu = random.randint(max(0, states[i].cpu - 15), min(states[i].cpu + 15, 100))
        states[i].ram_used = random.randint(max(0, states[i].ram_used - 1024), min(states[i].ram_used + 2048, 4096))
    return STATE_DUMMY
    

@app.get("/vm/{id}/networkdata") # * request for network data of VM with specific <id>
async def get_vm_network_data(
    id: int,
    current_user: Annotated[User, Depends(get_current_user)], # ! -"-
) -> MachineNetworkData: # 
    # ...
    # ... code here
    # ...
    # example return:
    return NETWORK_DATA_DUMMY[id]

@app.get("/vm/{id}/state") # * request for network data of VM with specific <id>
async def get_vm_state(
    id: int,
    current_user: Annotated[User, Depends(get_current_user)], # ! -"-
) -> MachineState:
    # ...
    # ... code here
    # ...
    # example return:
    
    state = STATE_DUMMY[id]
    if not state.active: return state
    state.cpu = random.randint(max(0, state.cpu - 15), min(state.cpu + 15, 100))
    state.ram_used = random.randint(max(0, state.ram_used - 1024), min(state.ram_used + 2048, 4096))
    return state