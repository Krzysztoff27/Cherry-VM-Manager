import { Container } from '@mantine/core';
import { Background, Controls, ReactFlow, useNodesState, addEdge } from '@xyflow/react';
import { useCallback, useEffect, useRef } from 'react';
import { IconCloudComputing, IconDeviceDesktop, IconServer2 } from '@tabler/icons-react';

import FloatingEdge from './components/Floating/FloatingEdge/FloatingEdge';
import FloatingConnectionLine from './components/Floating/FloatingConnectionLine/FloatingConnectionLine';
import MachineNode from './components/MachineNode/MachineNode';
import IntnetNode from './components/IntnetNode/IntnetNode'
import NumberAllocator from '../../systems/numberAllocator';

import '@xyflow/react/dist/style.css';

const nodeTypes = {
    machine: MachineNode,
    intnet: IntnetNode,
}

const edgeTypes = {
    floating: FloatingEdge,
};

const defaultEdgeOptions = {
    deletable: true,
    selectable: true,
    type: 'floating',
}

export default function NetworkPanel({ authFetch, authOptions, logout }) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useNodesState([]);
    const allocator = useRef(new NumberAllocator()).current;

    const { loading, error, data } = authFetch('/vm/all/networkdata');

    useEffect(() =>
        setNodes(Object.values({ ...data }).map((vm, i) => ({
            id: `machine-${vm.id}`,
            type: 'machine',
            position: {
                x: (i % 16) * 300,  // X position based on column
                y: Math.floor(i / 16) * 300  // Y position based on row
            },
            data: { 
                label: `${vm.group} ${vm.group_member_id}`,
                icon: (
                    vm.group === 'desktop' ? IconDeviceDesktop :
                    vm.group === 'serwer'  ? IconServer2 : null
                ),
            },
            deletable: false,
            selectable: false,
        }))), [data]
    )

    const onConnect = useCallback(
        ({ source, target }) => {
            if(source.startsWith('intnet')) return;
            if(target.startsWith('intnet')) return setEdges((eds) => addEdge({source: source, target: target}, eds), [setEdges]);

            // connection between vm and vm (new intnet gets created):
            const intnet = allocator.getNext();
            const intnetNodeId = `intnet-${intnet}`;

            const getNodePos = (id, nds) => nds.find(n => n.id === id).position
            const calcCentralPos = (nds = [], axis) => (getNodePos(source, nds)[axis] + getNodePos(target, nds)[axis])/2;

            setNodes(currentNodes => [...currentNodes, {
                id: intnetNodeId,
                type: 'intnet',
                intnet: intnet,
                position: {
                    x: calcCentralPos(currentNodes, 'x'),
                    y: calcCentralPos(currentNodes, 'y'),
                },
                data: { 
                    label: `Intnet ${intnet}`
                },
            }])

            return setEdges((eds) =>
                addEdge({ source: target, target: intnetNodeId },
                    addEdge({ source: source, target: intnetNodeId }, eds)
                ));
        },
        [setEdges]
    );

    const onNodesDelete = ((nodes) => 
        nodes.forEach(node => allocator.remove(node?.intnet))
    );

    if (loading) return;
    if (error) return;

    return (
        <Container h='96.5vh' fluid>
            <ReactFlow
                colorMode='dark'
                connectionMode='loose'
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodesDelete={onNodesDelete}
                defaultEdgeOptions={defaultEdgeOptions}
                edgeTypes={edgeTypes}
                nodeTypes={nodeTypes}
                connectionLineComponent={FloatingConnectionLine}
            >
                <Background />
                <Controls />
            </ReactFlow>
        </Container>

    )
}
