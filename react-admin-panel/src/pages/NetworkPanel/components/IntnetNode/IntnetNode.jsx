import { Handle, Position } from '@xyflow/react';
import { Stack, Text } from '@mantine/core';
import classes from './IntnetNode.module.css';

export default function IntnetNode({ data}) {
    return (
        <Stack align='center' p='2' gap='0' w={100}>
            <Handle
                className={classes.customHandle}
                position={Position.Left}
                type="target"
                isConnectableStart={false}
            />
            <Text ta='center' tt="capitalize" style={{fontSize: '18px'}}>{data.label}</Text>
        </Stack>
    );
}
