import { Container } from '@mantine/core';
import { IconDeviceDesktop, IconServer2 } from '@tabler/icons-react';
import { Background, Controls, MiniMap, ReactFlow, ReactFlowProvider, addEdge, applyEdgeChanges, applyNodeChanges, useReactFlow } from '@xyflow/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import NumberAllocator from '../../handlers/numberAllocator';
import FloatingConnectionLine from './components/Floating/FloatingConnectionLine/FloatingConnectionLine';
import FloatingEdge from './components/Floating/FloatingEdge/FloatingEdge';
import FlowPanel from './components/FlowPanel/FlowPanel';
import IntnetNode from './components/IntnetNode/IntnetNode';
import MachineNode from './components/MachineNode/MachineNode';

import { noneOrEmpty, safeObjectValues } from '../../utils/misc';
import { calcMiddlePosition, getIdFromNodeId, getNodeId } from '../../utils/reactFlow';

import '@xyflow/react/dist/style.css';
import useAuth from '../../hooks/useAuth';
import useFetch from '../../hooks/useFetch';
import Prompt from '../../components/Prompt/Prompt';
import useApi from '../../hooks/useApi';


const NODE_TYPES = {
    machine: MachineNode,
    intnet: IntnetNode,
}

const EDGE_TYPES = {
    floating: FloatingEdge,
};

const DEFAULT_EDGE_OPTIONS = {
    deletable: true,
    selectable: true,
    type: 'floating',
}

const createNode = (type, data, position) => {
    switch(type){
        case MachineNode: return createMachineNode(data, position);
        case IntnetNode: return createIntnetNode(data, position);
        default: return {};
    }
}

const createMachineNode = (machine, position) => ({
    id: getNodeId(NODE_TYPES.machine, machine.id),
    type: 'machine',
    position: position,
    deletable: false,
    selectable: false,
    data: {
        label: `${machine.group} ${machine.group_member_id}`,
        icon: (
            machine.group === 'desktop' ? IconDeviceDesktop :
            machine.group === 'serwer'  ? IconServer2 : null
        ),
    },
})

const createIntnetNode = (intnet, position) => ({
    id: getNodeId(NODE_TYPES.intnet, intnet.id),
    type: 'intnet',
    intnet: intnet.id,
    position: position,
    data: { 
        label: `Intnet ${intnet.id}`
    },
})

const newPositionsAllocator = new NumberAllocator();
const generateNewPos = () => ({x: newPositionsAllocator.getNext() * 100, y: 0});

const extractPositionsFromNodes = (nodes) => nodes?.reduce(
    (acc, { id, position }) => ({ ...acc, [id]: position }), {}
) ?? {};


function Flow({ }) {
    const { authOptions } = useAuth();
    const { get, post, put } = useApi();
    
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [rfInstance, setRfInstance] = useState(null);
    const { getNode, setViewport, getEdges } = useReactFlow();
    
    const [isDirty, setIsDirty] = useState(true);
    const allocator = useRef(new NumberAllocator()).current;

    const { loading: machinesLoading, error: machinesError, data: machines } = useFetch('/vm/all/networkdata', authOptions);
    
    const addNodes = (...nodes) => setNodes(nds => [...nds, ...nodes.flat()]);
    const addEdgeToFlow = (edge) => setEdges(eds => addEdge(edge, eds));

    // NODES

    const onNodesChange = useCallback((changes) => {
            setNodes((nds) => applyNodeChanges(changes, nds));
            setIsDirty(true);
        }, [],
    );

    const onNodesDelete = useCallback((deletedNodes) => {
        deletedNodes.forEach(node => allocator.remove(node?.intnet));
    });

    // EDGES

    const onEdgesChange = useCallback((changes) => {
            setEdges((eds) => applyEdgeChanges(changes, eds));
            setIsDirty(true);
        },[],
    );

    // CONNECT

    const onConnect = useCallback(({ source, target }) => {
            if(source.startsWith('intnet')) return;
            if(target.startsWith('intnet')) return addEdgeToFlow({source: source, target: target});
            
            const intnetId = allocator.getNext(); 
            const intnetNode = createIntnetNode({id: intnetId}, calcMiddlePosition(getNode(source).position, getNode(target).position));
            
            addNodes(intnetNode);
            addEdgeToFlow({source: target, target: intnetNode.id});
            addEdgeToFlow({source: source, target: intnetNode.id});
        }, 
        [setEdges]
    );    

    // FLOW

    const resetFlow = useCallback(async (resetViewport = true) => { 
        const flow = await get('/network/configuration', authOptions);
        if(!flow) return;

        if(resetViewport) setViewport({x: 0, y: 0, zoom: 1, ...flow.viewport});

        const positions = extractPositionsFromNodes(flow?.nodes);
        setNodes([]);
        setEdges([]);
        createMachineNodes(positions);
        createFlowNodes(NODE_TYPES.intnet, safeObjectValues(flow?.intnets), positions);
        createIntnetEdges(flow?.intnets);
        
        allocator.setCurrent(Math.max(...Object.keys(flow?.intnets || {})));
    });

    const createFlowNodes = (nodeType, data = [], positions) => {
        if(noneOrEmpty(data) || !nodeType) return;

        const getPos = (id) => positions[getNodeId(nodeType, id)] ?? generateNewPos();
        addNodes(data.map(node => 
            createNode(nodeType, node, getPos(node.id))
        ));
    }

    const createMachineNodes = (positions) => createFlowNodes(NODE_TYPES.machine, safeObjectValues(machines), positions);

    const createIntnetEdges = (intnets) => {
        if(!intnets) return;

        safeObjectValues(intnets).forEach(
            ({machines, id}) => machines ? 
                machines.forEach(machineId => 
                    addEdgeToFlow({
                        source: getNodeId(NODE_TYPES.machine, machineId),
                        target: getNodeId(NODE_TYPES.intnet, id),
                    })
                )
            : null,
        )
    }

    const saveFlowState = (_) => {
        putFlowState(takeSnapshot());
        putIntnetConfiguration();
        setIsDirty(false);
    }

    // SNAPSHOTS

    const takeSnapshot = useCallback(() => rfInstance.toObject(), [rfInstance]);

    const loadSnapshot = async (id) => {
        const snapshot = await get(`/network/snapshot/${id}`, authOptions);
        const flow = snapshot.data;
        
        if (!flow || !flow.nodes) return;

        setNodes([]);
        const machinePositions = extractPositionsFromNodes(flow.nodes.filter?.(node => node.type === 'machine') || []);
        createMachineNodes(machinePositions);

        const intnetNodes = flow.nodes.filter(node => node.type === 'intnet');
        addNodes(intnetNodes);
        setEdges(flow.edges || []);
    }

    // SEND REQUESTS

    const putFlowState = (state) => put('/network/configuration/panelstate', JSON.stringify(state), authOptions);
    const putIntnetConfiguration = () => put('/network/configuration/intnets', JSON.stringify(getIntnetConfFromCurrentState()), authOptions);
    const postSnapshot = (snapshot) => post('/network/snapshot', JSON.stringify(snapshot), authOptions);

    // INTNET CONFIG

    const getIntnetConfFromCurrentState = () => 
        getEdges().reduce((acc, { source, target }) => {
            const [intnetId, machineId] = [getIdFromNodeId(target), getIdFromNodeId(source)];

            if (intnetId !== null && machineId !== null) {
                if(!acc[intnetId]) acc[intnetId] = { id: intnetId, machines: [] };
                acc[intnetId].machines.push(machineId);
            }

            return acc;
        }, {});

    useEffect(() => {resetFlow()}, [machines])

    if (machinesLoading) return;
    if (machinesError) return;

    return (
        <>
        <Prompt when={isDirty}/>
        <Container h='96.5vh' fluid>
            <ReactFlow
                colorMode='dark'
                connectionMode='loose'
                onInit={setRfInstance}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onNodesDelete={onNodesDelete}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={NODE_TYPES}
                edgeTypes={EDGE_TYPES}
                defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
                connectionLineComponent={FloatingConnectionLine}
            >
                <FlowPanel 
                    saveFlowState={saveFlowState} 
                    resetFlow={resetFlow} 
                    isDirty={isDirty}
                    takeSnapshot={takeSnapshot}
                    postSnapshot={postSnapshot}
                    snapshotSelectProps={{loadSnapshot, authOptions}}
                />
                <Controls />
                <MiniMap nodeStrokeWidth={3} pannable zoomable/>
                <Background />
            </ReactFlow>
        </Container>
        </>
    )
}

export default function NetworkPanel(props){
    return (
        <ReactFlowProvider>
            <Flow {...props}/>
        </ReactFlowProvider>
    )
}