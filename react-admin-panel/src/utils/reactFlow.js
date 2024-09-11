import MachineNode from "../pages/NetworkPanel/components/MachineNode/MachineNode";
import IntnetNode from "../pages/NetworkPanel/components/IntnetNode/IntnetNode";

/**
 * Gets flow node id based on the node type and it's type's indentificator
 * @param {MachineNode|IntnetNode} type - node's type 
 * @param {number} num - id in said node type
 * @returns 
 */
export const getNodeId = (type, num) => {
    let prefix;
    switch(type){
        case MachineNode: prefix = 'machine-'; break;
        case IntnetNode: prefix = 'intnet-'; break;
    }
    return `${prefix}${num}`;
}

/**
 * Gets id (number) from the flow node id (string).
 * @param {string} nodeId - flow node id
 * @returns {number} id
 */
export const getIdFromNodeId = (nodeId) => nodeId.split('-')[1] || null;

/**
 * Calculates mean of both coordinates in given list of node positions
 * @param  {...import("../pages/NetworkPanel/NetworkPanel").Position} positions 
 * @returns {import("../pages/NetworkPanel/NetworkPanel").Position} 
 */
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

/**
 * Gets object of every node's positions
 * @param {Array} nodes 
 * @returns {Object.<string, import("../pages/NetworkPanel/NetworkPanel").Position>}
 */
export const extractPositionsFromNodes = (nodes) => nodes?.reduce(
    (acc, { id, position }) => ({ ...acc, [id]: position }), {}
) ?? {};

export default {
    getNodeId,
    getIdFromNodeId,
    calcMiddlePosition,
    extractPositionsFromNodes,
}
