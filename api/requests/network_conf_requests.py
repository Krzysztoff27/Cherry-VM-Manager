from fastapi import Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from typing import Annotated
from pathlib import Path

from main import app
from auth import get_current_user, User

from handlers.json_handler import JSONHandler

###############################
# json data constants and handlers
###############################

CURRENT_STATE_PATH = Path('data/network_configuration/current_state.local.json')
SNAPSHOTS_PATH = Path('data/network_configuration/snapshots.local.json')

current_state = JSONHandler(CURRENT_STATE_PATH) 
snapshots = JSONHandler(SNAPSHOTS_PATH) 

###############################
# classes & types
###############################

NodeId = str
MachineId = int
IntnetId = int

class Coordinates(BaseModel):
    x: int
    y: int

class Snapshot(BaseModel):
    nodes: list | None
    edges: list | None
    viewport: dict[str, int] | None

IntnetConfiguration = dict[IntnetId, list[MachineId]]
NodesState = dict[NodeId, Coordinates]

class CurrentConfiguration(BaseModel):
    intnetConfiguration: IntnetConfiguration | None
    nodesState: NodesState | None

###############################
# functions
###############################

def get_current_intnet_state() -> IntnetConfiguration: # !
    # ...
    # TODO: Implement the logic to retrieve the current internal network state
    # ...
    # ? example return:
    return {
        1:  [1, 17],  2:  [2, 18],  3:  [3, 19],  4:  [4, 20],  
        5:  [5, 21],  6:  [6, 22],  7:  [7, 23],  8:  [8, 24],  
        9:  [9, 25],  10: [10, 26], 11: [11, 27], 12: [12, 28],
        13: [13, 29], 14: [14, 30], 15: [15, 31], 16: [16, 32],
    }



###############################
# configuration requests
###############################

@app.get("/network/configuration")
def get_current_network_configuration(
    current_user: Annotated[User, Depends(get_current_user)]
):
    return CurrentConfiguration(
        intnetConfiguration = get_current_intnet_state(),
        nodesState = current_state.read(),
    )
    

@app.put("/network/configuration/intnets", status_code=204)
def apply_intnet_configuration_to_virtual_machines(
    intnet_configuration: IntnetConfiguration,
    current_user: Annotated[User, Depends(get_current_user)],
):
    # ...
    # TODO: function that applies intnet configuration to virtual machines
    # ...
    # ? returns null
    return
    
@app.put("/network/configuration/panelstate", status_code=204)
def save_panel_state(
    nodes_state: NodesState,
    current_user: Annotated[User, Depends(get_current_user)],
):
    current_state.write(jsonable_encoder(nodes_state))

###############################
# snapshot requests
###############################

@app.post("/network/snapshot", status_code=201)
def create_network_snapshot(
    snapshot: Snapshot,
    current_user: Annotated[User, Depends(get_current_user)],
):
    snapshots_list = snapshots.read()
    if not isinstance(snapshots_list, list): 
        snapshots_list = []

    snapshots_list.append(jsonable_encoder(snapshot))
    snapshots.write(snapshots_list)

    return snapshot

@app.get("/network/snapshot/{id}")
def get_network_configuration_snapshot(
    id: int,
    current_user: Annotated[User, Depends(get_current_user)],
) -> Snapshot:
    snapshots_list = snapshots.read()

    if not isinstance(snapshots_list, list): 
        raise HTTPException(status_code=404, detail="Snapshot not found")
    if id < 0 or id >= len(snapshots_list):
        raise HTTPException(status_code=404, detail=f"Snapshot of id={id} not found")

    return snapshots_list[id]

@app.delete("/network/snapshot/{id}", status_code=204)
def delete_network_configuration_snapshot(
    id: int,
    current_user: Annotated[User, Depends(get_current_user)],
):
    snapshots_list = snapshots.read()

    if not isinstance(snapshots_list, list): 
        raise HTTPException(status_code=404, detail="Snapshot not found")
    if id < 0 or id >= len(snapshots_list):
        raise HTTPException(status_code=404, detail=f"Snapshot of id={id} not found")
    
    snapshots_list.pop(id)
    snapshots.write(snapshots_list)


