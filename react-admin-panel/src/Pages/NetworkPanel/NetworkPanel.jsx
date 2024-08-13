import { Button, Container } from '@mantine/core';
import { Background, Controls, ReactFlow, useNodesState, addEdge, MiniMap, Panel, applyEdgeChanges, applyNodeChanges } from '@xyflow/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconCheck, IconCircleCheck, IconDeviceDesktop, IconDeviceFloppy, IconServer2 } from '@tabler/icons-react';

import FloatingEdge from './components/Floating/FloatingEdge/FloatingEdge';
import FloatingConnectionLine from './components/Floating/FloatingConnectionLine/FloatingConnectionLine';
import MachineNode from './components/MachineNode/MachineNode';
import IntnetNode from './components/IntnetNode/IntnetNode'
import NumberAllocator from '../../handlers/numberAllocator';
import put from '../../api/put';

import '@xyflow/react/dist/style.css';
import styles from './NetworkPanel.module.css'

const NODE_TYPES = {
    machine: MachineNode,
    intnet: IntnetNode,
}

const EDGE_TYPES = {
    floating: FloatingEdge,
};

const defaultEdgeOptions = {
    deletable: true,
    selectable: true,
    type: 'floating',
}

const safeObjectValues = (obj) => Object.values({...(obj || {})});

const getNodeId = (type, num) => {
    let prefix;
    switch(type){
        case MachineNode: prefix = 'machine-'; break;
        case IntnetNode: prefix = 'intnet-'; break;
    }
    return prefix + num;
}

const getIdFromNodeId = (nodeId) => nodeId.split('-')[1] || null;

const calcMiddlePosition = (...positions) => {
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

const getMachineNode = (vm, position) => ({
    id: getNodeId(NODE_TYPES.machine, vm.id),
    type: 'machine',
    position: position,
    deletable: false,
    selectable: false,
    data: {
        label: `${vm.group} ${vm.group_member_id}`,
        icon: (
            vm.group === 'desktop' ? IconDeviceDesktop :
            vm.group === 'serwer'  ? IconServer2 : null
        ),
    },
})

const getIntnetNode = (id, position) => ({
    id: getNodeId(NODE_TYPES.intnet, id),
    type: 'intnet',
    intnet: id,
    position: position,
    data: { 
        label: `Intnet ${id}`
    },
})


export default function NetworkPanel({ authFetch, authOptions, logout }) {
    const allocator = useRef(new NumberAllocator()).current;
    const [changed, setChanged] = useState(false);
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    
    const { loading: machinesLoading, error: machinesError, data: machines } = authFetch('/vm/all/networkdata');
    const { loading: configurationLoading, error: configurationError, data: configuration} = authFetch('/network/configuration');

    const resetFlow = () => {
        const positions = configuration?.nodesState ?? {};
    
        const machineNodes = safeObjectValues(machines).map((vm) => 
            getMachineNode(vm, positions[getNodeId(NODE_TYPES.machine, vm.id)] ?? {x: 0, y: 0})
        );
    
        const intnetNodes = safeObjectValues(configuration?.intnets).map((intnet) => 
            getIntnetNode(
                intnet.id, 
                positions[getNodeId(NODE_TYPES.intnet, intnet.id)] ?? // get intnet node position from memory, or calculate middle position between joined machines
                    calcMiddlePosition(...intnet.machines.map(machineId => positions[getNodeId(NODE_TYPES.machine, machineId)]))
            )
        );
    
        setNodes([...machineNodes, ...intnetNodes])
    
        safeObjectValues(configuration?.intnets).forEach((intnet) => {
            intnet.machines.forEach(machineId => 
                setEdges((eds) => addEdge({
                    source: getNodeId(NODE_TYPES.machine, machineId),
                    target: getNodeId(NODE_TYPES.intnet, intnet.id),
                }, eds)))
        })
        
        allocator.setCurrent(Math.max(...Object.keys({...configuration?.intnets})));
    }

    const postIntnetConfiguration = useCallback(() => {
        setEdges((eds) => {
            let intnets = {};

            for(const edge of eds){
                const intnetId = getIdFromNodeId(edge.target);
                const machineId = getIdFromNodeId(edge.source);
                if(intnetId === null || machineId === null) continue;

                if(intnets[intnetId] === undefined) intnets[intnetId] = {id: intnetId, machines: [machineId]};
                else intnets[intnetId].machines.push(machineId);
            }

            put('/network/configuration/intnets', JSON.stringify(intnets), authOptions);
            
            return eds;
        })
    }, [edges])

    const postFlowState = useCallback(() => {
        setNodes((nds) => {
            const state = nds?.reduce((acc, node) => {
                acc[node.id] = node.position
                return acc;
            }, {});

            put('/network/configuration/panelstate', JSON.stringify(state), authOptions);

            return nds;
        })
    }, [nodes])
    
    const onNodesChange = useCallback(
        (changes) => {
            setNodes((nds) => applyNodeChanges(changes, nds));
            setChanged(true);
        }, 
        [],
    );

    const onEdgesChange = useCallback(
        (changes) => {
            setEdges((eds) => applyEdgeChanges(changes, eds))
            setChanged(true);
        },
        [],
    );

    const onConnect = useCallback(
        ({ source, target }) => {
            if(source.startsWith('intnet')) return;
            if(target.startsWith('intnet')) return setEdges((eds) => addEdge({source: source, target: target}, eds), [setEdges]);
            
            // connection between vm and vm (new intnet gets created):
            const intnetId = allocator.getNext();
            
            setNodes(currentNodes => {
                const getNodePos = (id) => currentNodes.find(n => n.id === id).position
                const position = calcMiddlePosition(getNodePos(source), getNodePos(target))
                return [...currentNodes, getIntnetNode(intnetId, position)]
            })

            setEdges((eds) =>
                addEdge({ source: target, target: getNodeId(NODE_TYPES.intnet, intnetId) },
                    addEdge({ source: source, target: getNodeId(NODE_TYPES.intnet, intnetId) }, eds)
            ));
        },
        [setEdges]
    );

    const onNodesDelete = useCallback((nodes) => {
        nodes.forEach(node => allocator.remove(node?.intnet));
    });

    useEffect(() => resetFlow(), [configuration])

    if (machinesLoading) return;
    if (machinesError) return;

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
                nodeTypes={NODE_TYPES}
                edgeTypes={EDGE_TYPES}
                connectionLineComponent={FloatingConnectionLine}
            >
                <Panel position="top-center">
                    <Button 
                        onClick={() => {
                            postIntnetConfiguration();
                            postFlowState();
                            setChanged(false);
                        }}
                        disabled={!changed}
                        variant='default' 
                        leftSection={changed ? <IconDeviceFloppy size='22' stroke={1.5}/> : <IconCheck size='22' stroke={2}/>}
                        className={styles.button}
                        size='sm'
                    >
                        {changed ? 'Zapisz zmiany' : 'Zapisano!'}
                    </Button>
                </Panel>
                <Controls />
                <MiniMap nodeStrokeWidth={3} pannable zoomable/>
                <Background />
            </ReactFlow>
        </Container>

    )
}
