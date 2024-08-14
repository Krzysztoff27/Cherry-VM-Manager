import { Handle, Position } from '@xyflow/react';
import { Stack, Text } from '@mantine/core';

export default function IntnetNode({ id, data}) {
    return (
        <Stack align='center' p='2' gap='0' w={100}>
            <Handle
                className="customHandle"
                position={Position.Left}
                type="target"
                isConnectableStart={false}
            />
            <Text ta='center' tt="capitalize" style={{fontSize: '18px'}}>{data.label}</Text>
        </Stack>
    );
}
