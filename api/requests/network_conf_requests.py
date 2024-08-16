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

MachineId = int
IntnetId = int

class Intnet(BaseModel):
    id: IntnetId
    machines: list[MachineId] = []

IntnetConfiguration = dict[IntnetId, Intnet]


class Coordinates(BaseModel):
    x: float = 0
    y: float = 0

class Viewport(Coordinates):
    zoom: float = 1

class SnapshotData(BaseModel):
    nodes: list = []
    viewport: Viewport | None = None

class PanelState(SnapshotData):
    intnets: IntnetConfiguration | None = None

class Snapshot(BaseModel):
    id: int
    name: str = "Unnamed"
    deletable: bool = True
    data: SnapshotData | None = None

###############################
# functions
###############################

def get_current_intnet_state() -> IntnetConfiguration: # !
    # ...
    # TODO: Implement the logic to retrieve the current internal network state
    # ...
    # ? example return:
    return {
        1:  Intnet(id=1, machines=[1, 17]),  
        2:  Intnet(id=2, machines=[2, 18]),  
        3:  Intnet(id=3, machines=[3, 19]),  
        4:  Intnet(id=4, machines=[4, 20]),  
        5:  Intnet(id=5, machines=[5, 21]),  
        6:  Intnet(id=6, machines=[6, 22]),  
        7:  Intnet(id=7, machines=[7, 23]),  
        8:  Intnet(id=8, machines=[8, 24]),  
        9:  Intnet(id=9, machines=[9, 25]),  
        10: Intnet(id=10, machines=[10, 26]),  
        11: Intnet(id=11, machines=[11, 27]),  
        12: Intnet(id=12, machines=[12, 28]),  
        13: Intnet(id=13, machines=[13, 29]),  
        14: Intnet(id=14, machines=[14, 30]),  
        15: Intnet(id=15, machines=[15, 31]),  
        16: Intnet(id=16, machines=[16, 32])
    }

###############################
# configuration requests
###############################

@app.get("/network/configuration")
def get_current_network_configuration(
    current_user: Annotated[User, Depends(get_current_user)]
) -> PanelState:
    return PanelState(
        intnets = get_current_intnet_state(),
        **current_state.read(),
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
    panel_state: SnapshotData,
    current_user: Annotated[User, Depends(get_current_user)],
):
    current_state.write(jsonable_encoder(panel_state))

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

@app.get("/network/snapshot/all")
def get_all_snapshots(
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Snapshot]:
    snapshots_list = snapshots.read()
    
    if not isinstance(snapshots_list, list): 
        raise HTTPException(status_code=404, detail="Could not find the snapshots: Snapshot list is empty or undefined")
    
    return snapshots_list

@app.get("/network/snapshot/{id}")
def get_snapshot(
    id: int,
    current_user: Annotated[User, Depends(get_current_user)],
) -> Snapshot:
    snapshots_list = snapshots.read()

    if not isinstance(snapshots_list, list): 
        raise HTTPException(status_code=404, detail="Could not find the snapshot: Snapshot list is empty or undefined")
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
    
    deleted = snapshots_list.pop(id)
    snapshots.write(snapshots_list)
    return deleted


