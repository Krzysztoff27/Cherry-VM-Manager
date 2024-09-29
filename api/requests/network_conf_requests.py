from fastapi import Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from typing import Annotated
from pathlib import Path
from threading import Lock
import re
import uuid

from main import app
from auth import get_authorized_user, User

from handlers.json_handler import JSONHandler

###############################
# json data constants and handlers
###############################

CURRENT_STATE_PATH = Path('data/network_configuration/current_state.local.json')
SNAPSHOTS_PATH = Path('data/network_configuration/snapshots.local.json')
PRESETS_PATH = Path('data/network_configuration/presets.json')

current_state = JSONHandler(CURRENT_STATE_PATH) 
snapshots = JSONHandler(SNAPSHOTS_PATH) 
presets = JSONHandler(PRESETS_PATH) 

lock = Lock()

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
    
class FlowState(BaseModel):
    nodes: list = []
    viewport: Viewport | None = None

class NetworkConfiguration(FlowState):
    intnets: IntnetConfiguration | None = None

class SnapshotCreate(NetworkConfiguration):
    name: str = "Unnamed"

class Snapshot(SnapshotCreate):
    uuid: str

class PresetCoreFunctions(BaseModel):
    getIntnet: str = ""
    getPosX: str = ""
    getPosY: str = ""

class PresetCustomFunction(BaseModel):
    expression: str = "",
    arguments: list[str] = [],

class PresetData(BaseModel):
    variables: dict[str, str] = {}
    customFunctions: dict[str, PresetCustomFunction] = {}
    coreFunctions: PresetCoreFunctions = {}

class PresetCreate(BaseModel):
    name: str = "Unnamed"
    data: PresetData = {}

class Preset(PresetCreate):
    uuid: str

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

def isIndexInList(_list, index):
    return index >= 0 and index < len(_list)

def raise404(element_name: str = 'element'):
    raise HTTPException(status_code=404, detail=f"{element_name[0].upper()}{element_name[1:]} not found")

def validateJSONList(_list, element_name: str = 'element'):
    if not isinstance(_list, list): 
        raise404(element_name)

def getByUUID(_list, uuid, element_name: str = 'element'):
    for item in _list:
        if item['uuid'] == uuid: 
            return item        
    raise404(element_name)

def getIndexByUUID(_list, uuid, element_name: str = 'element'):
    for i, item in enumerate(_list):
        if item['uuid'] == uuid: 
            return i
    raise404(element_name)

###############################
# configuration requests
###############################

@app.get("/network/configuration")
def get_current_network_configuration(
    current_user: Annotated[User, Depends(get_authorized_user)]
) -> NetworkConfiguration:
    return NetworkConfiguration(
        intnets = get_current_intnet_state(),
        **current_state.read(),
    )
    

@app.put("/network/configuration/intnets", status_code=204)
def apply_intnet_configuration_to_virtual_machines(
    intnet_configuration: IntnetConfiguration,
    current_user: Annotated[User, Depends(get_authorized_user)],
):
    # ...
    # TODO: function that applies intnet configuration to virtual machines
    # ...
    # ? returns null
    return
    
@app.put("/network/configuration/panelstate", status_code=204)
def save_flow_state(
    flow_state: FlowState,
    current_user: Annotated[User, Depends(get_authorized_user)],
):
    current_state.write(jsonable_encoder(flow_state))

###############################
# snapshot requests
###############################

@app.post("/network/snapshot", status_code=201)
def create_network_snapshot(
    snapshot: SnapshotCreate,
    current_user: Annotated[User, Depends(get_authorized_user)],
) -> Snapshot:
    with lock:
        snapshots_list = snapshots.read()
        if not isinstance(snapshots_list, list): 
            snapshots_list = []
        if not re.match(r'^[!-z]{3,24}$', snapshot.name):
            raise HTTPException(status_code=400, detail="Invalid characters in the snapshot name.")
        if any(s['name'] == snapshot.name for s in snapshots_list):
            raise HTTPException(status_code=409, detail="Snapshot with this name already exists.")

        snapshot = jsonable_encoder({**jsonable_encoder(snapshot), 'uuid': str(uuid.uuid4())})
        snapshots_list.append(snapshot)
        snapshots.write(snapshots_list)

        return snapshot

@app.get("/network/snapshot/all")
def get_all_snapshots(
    current_user: Annotated[User, Depends(get_authorized_user)],
) -> list:
    snapshots_list = snapshots.read()
    if not isinstance(snapshots_list, list): return []
    return snapshots_list

@app.get("/network/snapshot/{uuid}")
def get_snapshot(
    uuid: str,
    current_user: Annotated[User, Depends(get_authorized_user)],
) -> Snapshot:
    snapshots_list = snapshots.read()
    validateJSONList(snapshots_list, 'snapshot')
    return getByUUID(snapshots_list, uuid, 'snapshot')
    
@app.post("/network/snapshot/{uuid}/rename/{name}")
def rename_snapshot(
    uuid: str,
    name: str,
    current_user: Annotated[User, Depends(get_authorized_user)],
) -> Snapshot:
    with lock:
        snapshots_list = snapshots.read()
        validateJSONList(snapshots_list, 'snapshot')

        for s in snapshots_list:
            if s['name'] == name: raise HTTPException(status_code=409, detail="Snapshot with this name already exists.")

        index = getIndexByUUID(snapshots_list, uuid, 'snapshot')
        snapshots_list[index]['name'] = name

        snapshots.write(snapshots_list)
        return snapshots_list[index]

@app.delete("/network/snapshot/{uuid}")
def delete_network_configuration_snapshot(
    uuid: str,
    current_user: Annotated[User, Depends(get_authorized_user)],
):
    with lock:
        snapshots_list = snapshots.read()
        validateJSONList(snapshots_list, 'snapshot')
        index = getIndexByUUID(snapshots_list, uuid, 'snapshot')
        snapshot = snapshots_list.pop(index)

        snapshots.write(snapshots_list)
        return snapshot

###############################
# preset requests
###############################

@app.get("/network/preset/all")
def get_all_snapshots(
    current_user: Annotated[User, Depends(get_authorized_user)],
) -> list:
    presets_list = presets.read()
    if not isinstance(presets_list, list): return []
    return presets_list

@app.get("/network/preset/{uuid}")
def get_network_configuration_preset(
    uuid: str,
    current_user: Annotated[User, Depends(get_authorized_user)]
) -> Preset:
    presets_list = presets.read()
    validateJSONList(presets_list, 'preset')
    return getByUUID(presets_list, uuid, 'preset') 
