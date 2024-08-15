import { Button, Container } from '@mantine/core';
import { Background, Controls, ReactFlow, addEdge, MiniMap, Panel, applyEdgeChanges, applyNodeChanges, useReactFlow, ReactFlowProvider } from '@xyflow/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconCheck, IconDeviceDesktop, IconDeviceFloppy, IconServer2 } from '@tabler/icons-react';

import FloatingEdge from './components/Floating/FloatingEdge/FloatingEdge';
import FloatingConnectionLine from './components/Floating/FloatingConnectionLine/FloatingConnectionLine';
import MachineNode from './components/MachineNode/MachineNode';
import IntnetNode from './components/IntnetNode/IntnetNode';
import NumberAllocator from '../../handlers/numberAllocator';

import '@xyflow/react/dist/style.css';
import styles from './NetworkPanel.module.css';

import { post, put, get } from '../../api/requests';
import { safeObjectValues } from '../../utils/misc';
import { calcMiddlePosition, getIdFromNodeId, getNodeId } from '../../utils/reactFlow';

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


const getMachineNode = (machine, position) => ({
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

const getIntnetNode = (id, position) => ({
    id: getNodeId(NODE_TYPES.intnet, id),
    type: 'intnet',
    intnet: id,
    position: position,
    data: { 
        label: `Intnet ${id}`
    },
})


function Flow({ authFetch, authOptions, errorHandler }) {
    const allocator = useRef(new NumberAllocator()).current;
    const [changed, setChanged] = useState(false);
    
    const { loading: machinesLoading, error: machinesError, data: machines } = authFetch('/vm/all/networkdata');
    
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [rfInstance, setRfInstance] = useState(null);
    const { getNode, setViewport, getEdges } = useReactFlow();

    const createNodes = (...nodes) => setNodes(nds => [...nds, ...nodes.flat()]);
    const createEdge = (edge) => setEdges(eds => addEdge(edge, eds));

    const onNodesChange = useCallback((changes) => {
            setNodes((nds) => applyNodeChanges(changes, nds));
            setChanged(true);
        }, 
        [],
    );

    const onNodesDelete = useCallback((nodes) => {
        nodes.forEach(node => allocator.remove(node?.intnet));
    });

    const onEdgesChange = useCallback((changes) => {
            setEdges((eds) => applyEdgeChanges(changes, eds));
            setChanged(true);
        },
        [],
    );

    const onConnect = useCallback(({ source, target }) => {
            if(source.startsWith('intnet')) return;
            if(target.startsWith('intnet')) return createEdge({source: source, target: target});
            
            const intnetId = allocator.getNext(); 
            const intnetNode = getIntnetNode(intnetId, calcMiddlePosition(getNode(source).position, getNode(target).position));
            
            createNodes(intnetNode);
            createEdge({source: target, target: intnetNode.id});
            createEdge({source: source, target: intnetNode.id});
        }, 
        [setEdges]
    );

    const takeSnapshot = useCallback(() => rfInstance ? rfInstance.toObject() : undefined, [rfInstance]);

    const postSnapshot = (snapshot) => post('/network/snapshot', JSON.stringify(snapshot), authOptions, errorHandler);
    const putFlowState = (snapshot) => put('/network/configuration/panelstate', JSON.stringify(snapshot), authOptions, errorHandler);

    const saveCurrentFlowState = () => putFlowState(takeSnapshot());

    const resetFlow = useCallback(async () => { 
        const flow = await get('/network/configuration', authOptions, errorHandler);
        if(!flow) return;

        const DEFAULT_VIEWPORT = {x: 0, y: 0, zoom: 1}
        setViewport({...DEFAULT_VIEWPORT, ...flow.viewport});
        
        /**
         * @returns {Object} An object mapping node IDs to their positions.
        */
        const getSavedNodePositions = () => flow?.nodes?.reduce(
            (acc, { id, position }) => ({ ...acc, [id]: position }), {}
        ) ?? {};

        /**
         * creates nodes representing loaded virtual machines and applies their positions from API's database
         */
        const createMachineNodes = () => {
            if(!machines) return;

            const positions = getSavedNodePositions();
            const machineList = safeObjectValues(machines);

            const getPos = (id) => positions[getNodeId(NODE_TYPES.machine, id)]
            createNodes(machineList.map(machine => getMachineNode(machine, getPos(machine.id))))
        }

        /**
         * creates intnet nodes from API's database
         */
        const displayIntnetNodes = () => createNodes(flow?.nodes?.filter?.(node => node.type === 'intnet'));

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
        createMachineNodes();
        displayIntnetNodes();
        createIntnetEdges();
        
        allocator.setCurrent(Math.max(...Object.keys({...flow?.intnets})));
    });

    const postIntnetConfiguration = useCallback(() => {
        const intnets = getEdges().reduce((acc, { source, target }) => {
            const intnetId = getIdFromNodeId(target);
            const machineId = getIdFromNodeId(source);
    
            if (intnetId !== null && machineId !== null) {
                acc[intnetId] = acc[intnetId] || { id: intnetId, machines: [] };
                acc[intnetId].machines.push(machineId);
            }
    
            return acc;
        }, {});

        put('/network/configuration/intnets', JSON.stringify(intnets), authOptions);
        
        return eds;
        
    }, [edges])  

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
                <Panel position="top-center">
                    <Button 
                        onClick={() => {
                            saveCurrentFlowState();
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

export default function NetworkPanel(props){
    return (
        <ReactFlowProvider>
            <Flow {...props}/>
        </ReactFlowProvider>
    )
}