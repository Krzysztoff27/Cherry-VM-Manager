import { BaseEdge, EdgeLabelRenderer, getStraightPath, useInternalNode, useReactFlow } from '@xyflow/react';
import { getEdgeParams } from '../utils.js';
import { IconX } from '@tabler/icons-react'
import classes from '../Floating.module.css';

function FloatingEdge({ id, source, target, markerEnd, style }) {
    const { setEdges } = useReactFlow();
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);

    if (!sourceNode || !targetNode) {
        return null;
    }

    const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
        sourceNode,
        targetNode,
    );

    const [edgePath, labelX, labelY] = getStraightPath({
        sourceX: sx,
        sourceY: sy,
        sourcePosition: sourcePos,
        targetPosition: targetPos,
        targetX: tx,
        targetY: ty,
    });

    const removeEdge = () => {
        setEdges((edges) => edges.filter(edge => edge.id !== id))
    }

    return (
        <>
            <BaseEdge
                id={id}
                className={classes.edgePath}
                path={edgePath}
                markerEnd={markerEnd}
                style={style}
            />
            <EdgeLabelRenderer>
                <div
                    style={{ 
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                    }}
                >
                    <button className={classes.deleteButton} onClick={removeEdge}>
                        <IconX size={10} />
                    </button>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}

export default FloatingEdge;
