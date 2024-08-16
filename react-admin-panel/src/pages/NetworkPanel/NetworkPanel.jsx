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

import { get, post, put } from '../../api/requests';
import { noneOrEmpty, safeObjectValues } from '../../utils/misc';
import { calcMiddlePosition, getIdFromNodeId, getNodeId } from '../../utils/reactFlow';

import '@xyflow/react/dist/style.css';

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

const generateNode = (type, data, position) => {
    switch(type){
        case MachineNode: return generateMachineNode(data, position);
        case IntnetNode: return generateIntnetNode(data, position);
        default: return {};
    }
}

const generateMachineNode = (machine, position) => ({
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

const generateIntnetNode = (intnet, position) => ({
    id: getNodeId(NODE_TYPES.intnet, intnet.id),
    type: 'intnet',
    intnet: intnet.id,
    position: position,
    data: { 
        label: `Intnet ${intnet.id}`
    },
})


function Flow({ authFetch, authOptions, errorHandler }) {
    const allocator = useRef(new NumberAllocator()).current;
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    
    const { loading: machinesLoading, error: machinesError, data: machines } = authFetch('/vm/all/networkdata');
    
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [rfInstance, setRfInstance] = useState(null);
    const { getNode, setViewport, getEdges } = useReactFlow();

    const createNodes = (...nodes) => setNodes(nds => [...nds, ...nodes.flat()]);
    const createEdge = (edge) => setEdges(eds => addEdge(edge, eds));

    const onNodesChange = useCallback((changes) => {
            setNodes((nds) => applyNodeChanges(changes, nds));
            setUnsavedChanges(true);
        }, 
        [],
    );

    const onNodesDelete = useCallback((nodes) => {
        nodes.forEach(node => allocator.remove(node?.intnet));
    });

    const onEdgesChange = useCallback((changes) => {
            setEdges((eds) => applyEdgeChanges(changes, eds));
            setUnsavedChanges(true);
        },
        [],
    );

    const onConnect = useCallback(({ source, target }) => {
            if(source.startsWith('intnet')) return;
            if(target.startsWith('intnet')) return createEdge({source: source, target: target});
            
            const intnetId = allocator.getNext(); 
            const intnetNode = generateIntnetNode({id: intnetId}, calcMiddlePosition(getNode(source).position, getNode(target).position));
            
            createNodes(intnetNode);
            createEdge({source: target, target: intnetNode.id});
            createEdge({source: source, target: intnetNode.id});
        }, 
        [setEdges]
    );

    const takeSnapshot = useCallback(() => {
        const {edges: _, ...snapshot} = rfInstance.toObject() // remove edges
        return snapshot;
    });

    const resetFlow = useCallback(async (resetViewport = true) => { 
        const flow = await get('/network/configuration', authOptions, errorHandler);
        if(!flow) return;

        if(resetViewport) setViewport({x: 0, y: 0, zoom: 1, ...flow.viewport});

        const newPositionsAllocator = new NumberAllocator();
        const generateNewPos = () => ({x: newPositionsAllocator.getNext() * 100, y: 0});

        /**
         * 
         * @returns {Object} An object mapping node IDs to their positions.
        */
        const getSavedNodePositions = () => flow?.nodes?.reduce(
            (acc, { id, position }) => ({ ...acc, [id]: position }), {}
        ) ?? {};
        
        /** 
         * 
         * @param {Array} listOfNodesData list of objects containing parameters needed for the node creation (such as id)
         * @param {MachineNode || IntnetNode} nodeType 
         * @returns 
         */
        const generateFlowNodes = (listOfNodesData = [], nodeType) => {
            if(noneOrEmpty(listOfNodesData) || !nodeType) return;

            const positions = getSavedNodePositions();
            const getPos = (id) => positions[getNodeId(nodeType, id)] ?? generateNewPos();

            createNodes(listOfNodesData.map(node => 
                generateNode(nodeType, node, getPos(node.id))
            ));
        }

        /**
         * creates edges between nodes, based on current intnet configuration
         */
        const createIntnetEdges = () => {
            if(!flow?.intnets) return;

            safeObjectValues(flow.intnets).forEach(
                ({machines, id}) => machines ? 
                    machines.forEach(machineId => 
                        createEdge({
                            source: getNodeId(NODE_TYPES.machine, machineId),
                            target: getNodeId(NODE_TYPES.intnet, id),
                        })
                    )
                : null,
            )
        }

        setNodes([]);
        generateFlowNodes(safeObjectValues(machines),     NODE_TYPES.machine);
        generateFlowNodes(safeObjectValues(flow?.intnets), NODE_TYPES.intnet);
        createIntnetEdges();
        
        allocator.setCurrent(Math.max(...Object.keys({...flow?.intnets})));
    });

    const getIntnetConfFromCurrentState = () => 
        getEdges().reduce((acc, { source, target }) => {
            const [intnetId, machineId] = [getIdFromNodeId(target), getIdFromNodeId(source)];

            if (intnetId !== null && machineId !== null) {
                if(!acc[intnetId]) acc[intnetId] = { id: intnetId, machines: [] };
                acc[intnetId].machines.push(machineId);
            }

            return acc;
        }, {});

    const postSnapshot = (snapshot) => post('/network/snapshot', JSON.stringify(snapshot), authOptions, errorHandler);
    const putFlowState = (snapshot) => put('/network/configuration/panelstate', JSON.stringify(snapshot), authOptions, errorHandler);
    const postIntnetConfiguration = () => put('/network/configuration/intnets', JSON.stringify(getIntnetConfFromCurrentState()), authOptions);

    const loadSnapshot = async (id) => {
        const snapshot = await get(`/network/snapshot/${id}`, undefined, errorHandler);
        const flow = snapshot.data;

        if (!flow) return;
        setNodes(flow.nodes || []);
        setEdges(flow.edges || []);
    }

    const saveCurrentFlowState = (_) => {
        putFlowState(takeSnapshot());
        postIntnetConfiguration();
        setUnsavedChanges(false);
    }

    useEffect(() => {resetFlow()}, [machines])

    if (machinesLoading) return;
    if (machinesError) return;

    return (
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
                    saveCurrentFlowState={saveCurrentFlowState} 
                    resetFlow={resetFlow} 
                    unsavedChanges={unsavedChanges}
                    authFetch={authFetch}
                    loadSnapshot={loadSnapshot}
                />
                <Controls />
                <MiniMap nodeStrokeWidth={3} pannable zoomable/>
                <Background />
            </ReactFlow>
        </Container>
    )
}

export default function NetworkPanel(props){
    return (
        <ReactFlowProvider>
            <Flow {...props}/>
        </ReactFlowProvider>
    )
}