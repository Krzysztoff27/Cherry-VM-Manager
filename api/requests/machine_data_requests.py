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
        17: MachineNetworkData(id=17, group='server',  group_member_id=1, port=1501, domain='server1.wisniowa.oedu.pl'),
        18: MachineNetworkData(id=18, group='server',  group_member_id=2, port=1502, domain='server2.wisniowa.oedu.pl'),
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
        17: MachineState(id=17, group='server',  active=False, group_member_id=1),
        18: MachineState(id=18, group='server',  active=True, group_member_id=2, cpu=97, ram_used=1094, ram_max=4096),
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
) -> MachineState:
    # ...
    # ... code here
    # ...
    # example return:
    return MachineState(id=id, group='Desktop', group_member_id=1, active=True, cpu=42, ram_used=3462, ram_max=4096)