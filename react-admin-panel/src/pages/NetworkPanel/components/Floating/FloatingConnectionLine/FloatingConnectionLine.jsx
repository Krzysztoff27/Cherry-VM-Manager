import React from 'react';
import { getStraightPath } from '@xyflow/react';
import { getEdgeParams } from '../utils.js';
import classes from '../Floating.module.css'

function FloatingConnectionLine({
    toX,
    toY,
    fromPosition,
    toPosition,
    fromNode,
}) {
    if (!fromNode) {
        return null;
    }

    const targetNode = {
        id: 'connection-target',
        measured: {
            width: 1,
            height: 1,
        },
        internals: {
            positionAbsolute: { x: toX, y: toY },
        },
    };

    const { sx, sy } = getEdgeParams(fromNode, targetNode);
    const [edgePath] = getStraightPath({
        sourceX: sx,
        sourceY: sy,
        sourcePosition: fromPosition,
        targetPosition: toPosition,
        targetX: toX,
        targetY: toY,
    });

    return (
        <g>
            <path className={classes.connectionLinePath} d={edgePath}/>
            <circle cx={toX} cy={toY} r={3} className={classes.connectionLineCircle}/>
        </g>
    );
}

export default FloatingConnectionLine;
