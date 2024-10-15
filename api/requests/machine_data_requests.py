from fastapi import Depends
from pydantic import BaseModel
from typing import Annotated

from main import app
from auth import get_authorized_user, User

###############################
#           classes
###############################

class VirtualMachine(BaseModel):            # * parent class with properties needed in every request
    uuid: str                                 # unique ID for each machine
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

@app.get("/vm/all/networkdata", tags=['machine data']) # * request for network data of all VMs
async def get_all_vms_network_data(
    current_user: Annotated[User, Depends(get_authorized_user)], # ! provides authentication, no need to do anything with it
) -> dict[str, MachineNetworkData]:
    # ...
    # ... code here
    # ...
    # example return:
    return {
        'b38350cf-105f-4ecd-8eb4-3d9370d39f0e': MachineNetworkData(uuid='b38350cf-105f-4ecd-8eb4-3d9370d39f0e', group='desktop', group_member_id=1, port=1001, domain='desktop1.wisniowa.oedu.pl'),
        '280af110-b78c-4c7a-a554-d38bc0c428df': MachineNetworkData(uuid='280af110-b78c-4c7a-a554-d38bc0c428df', group='desktop', group_member_id=2, port=1002, domain='desktop2.wisniowa.oedu.pl'),
        # ...
        'a923601a-fc61-44cb-b007-5df89b1966e2': MachineNetworkData(uuid='a923601a-fc61-44cb-b007-5df89b1966e2', group='server',  group_member_id=1, port=1501, domain='server1.wisniowa.oedu.pl'),
        '67ac8bfd-2b97-4196-9572-5b519960bf3f': MachineNetworkData(uuid='67ac8bfd-2b97-4196-9572-5b519960bf3f', id=18, group='server',  group_member_id=2, port=1502, domain='server2.wisniowa.oedu.pl'),
        # ...
    }
    

@app.get("/vm/all/state", tags=['machine data']) # * request for state of all VMs
async def get_all_vms_state(
    current_user: Annotated[User, Depends(get_authorized_user)], # ! -"-
) -> dict[str, MachineState]:
    # ...
    # ... code here
    # ...
    # example return:
    return {
        'b38350cf-105f-4ecd-8eb4-3d9370d39f0e': MachineState(uuid='b38350cf-105f-4ecd-8eb4-3d9370d39f0e',group='desktop', active=True, group_member_id=1, cpu=42, ram_used=3462, ram_max=4096),
        '280af110-b78c-4c7a-a554-d38bc0c428df': MachineState(uuid='280af110-b78c-4c7a-a554-d38bc0c428df',group='desktop', active=False, group_member_id=2),
        # ...
        'a923601a-fc61-44cb-b007-5df89b1966e2': MachineState(uuid='a923601a-fc61-44cb-b007-5df89b1966e2', group='server',  active=False, group_member_id=1),
        '67ac8bfd-2b97-4196-9572-5b519960bf3f': MachineState(uuid='67ac8bfd-2b97-4196-9572-5b519960bf3f', group='server',  active=True, group_member_id=2, cpu=97, ram_used=1094, ram_max=4096),
        # ...
    }

@app.get("/vm/{uuid}/networkdata", tags=['machine data']) # * request for network data of VM with specific <id>
async def get_vm_network_data(
    uuid: str,
    current_user: Annotated[User, Depends(get_authorized_user)], # ! -"-
) -> MachineNetworkData: # 
    # ...
    # ... code here
    # ...
    # example return:
    return MachineNetworkData(uuid=uuid, group='desktop', group_member_id=1, port=1001, domain='desktop1.wisniowa.oedu.pl')

@app.get("/vm/{uuid}/state", tags=['machine data']) # * request for network data of VM with specific <id>
async def get_vm_state(
    uuid: str,
    current_user: Annotated[User, Depends(get_authorized_user)], # ! -"-
) -> MachineState:
    # ...
    # ... code here
    # ...
    # example return:
    return MachineState(uuid=uuid, group='Desktop', group_member_id=1, active=True, cpu=42, ram_used=3462, ram_max=4096)