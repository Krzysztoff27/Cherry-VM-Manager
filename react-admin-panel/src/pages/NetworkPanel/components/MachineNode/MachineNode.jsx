import { Handle, Position, useConnection } from '@xyflow/react';
import { Stack, Text } from '@mantine/core';
import classes from './MachineNode.module.css';

export default function MachineNode({ id, data}) {
    const connection = useConnection();

    const isConnecting = !!connection.startHandle;
    const isTarget = connection.startHandle && connection.startHandle.nodeId !== id;

    return (
        <Stack align='center' p='2' gap='0' className={classes.machineNode} w={100}>
            {!isConnecting && (
                <Handle
                    className={classes.customHandle}
                    position={Position.Right}
                    type="source"
                />
            )}
            <Handle
                className={classes.customHandle}
                position={Position.Left}
                type="target"
                isConnectableStart={false}
            />
            {data.icon ? <data.icon size={50} stroke={1.5}/> : null}
            <Text ta='center' tt="capitalize" className={classes.label}>{data.label}</Text>
        </Stack>
    );
}
