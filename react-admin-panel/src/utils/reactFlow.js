import MachineNode from "../pages/NetworkPanel/components/MachineNode/MachineNode";
import IntnetNode from "../pages/NetworkPanel/components/IntnetNode/IntnetNode";

export const getNodeId = (type, num) => {
    let prefix;
    switch(type){
        case MachineNode: prefix = 'machine-'; break;
        case IntnetNode: prefix = 'intnet-'; break;
    }
    return prefix + num;
}

export const getIdFromNodeId = (nodeId) => nodeId.split('-')[1] || null;

export const calcMiddlePosition = (...positions) => {
    if (positions.length === 0) return null;

    const sum = positions.reduce((acc, coords) => ({
        x: acc.x + (coords?.x ?? 0),
        y: acc.y + (coords?.y ?? 0),
    }), { x: 0, y: 0 });

    return {
        x: sum.x / positions.length,
        y: sum.y / positions.length
    };
};

export default {
    getNodeId,
    getIdFromNodeId,
    calcMiddlePosition,
}
