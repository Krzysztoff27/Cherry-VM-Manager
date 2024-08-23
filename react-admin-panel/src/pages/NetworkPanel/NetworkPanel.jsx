import { Container } from '@mantine/core';
import { notifications } from '@mantine/notifications';
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
import useErrorHandler from '../../hooks/useErrorHandler';


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
    switch (type) {
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
                machine.group === 'serwer' ? IconServer2 : null
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
const generateNewPos = () => ({ x: newPositionsAllocator.getNext() * 100, y: 0 });

const extractPositionsFromNodes = (nodes) => nodes?.reduce(
    (acc, { id, position }) => ({ ...acc, [id]: position }), {}
) ?? {};


function Flow({ }) {
    const { authOptions } = useAuth();
    const { scriptError, requestResponseError } = useErrorHandler();
    const { get, post, put } = useApi();

    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [rfInstance, setRfInstance] = useState(null);
    const { getNode, setViewport, getEdges } = useReactFlow();

    /**
     * [isDirty]
     * true - unsaved changes
     * false - no unsaved changes
     * null - no unsaved changes and just loaded
     */
    const [isDirty, setIsDirty] = useState(null);
    const allocator = useRef(new NumberAllocator()).current;

    const { loading: machinesLoading, error: machinesError, data: machines } = useFetch('/vm/all/networkdata', authOptions);

    const addNodes = (...nodes) => setNodes(nds => [...nds, ...nodes.flat()]);
    const addEdgeToFlow = (edge) => setEdges(eds => addEdge(edge, eds));

    // NODES

    const onNodesChange = useCallback((changes) => {
        setNodes((nds) => applyNodeChanges(changes, nds));
        if (changes && !changes.every(e => e.type === 'dimensions')) setIsDirty(true);
    }, [],
    );

    const onNodesDelete = useCallback((deletedNodes) => 
        deletedNodes.forEach(node => allocator.remove(node?.intnet)), []
    );

    // EDGES

    const onEdgesChange = useCallback((changes) => {
        setEdges((eds) => applyEdgeChanges(changes, eds));
        setIsDirty(true);
    }, [],
    );

    // CONNECT

    const onConnect = useCallback(({ source, target }) => {
        if (source.startsWith('intnet')) return;
        if (target.startsWith('intnet')) return addEdgeToFlow({ source: source, target: target });

        const intnetId = allocator.getNext();
        const intnetNode = createIntnetNode({ id: intnetId }, calcMiddlePosition(getNode(source).position, getNode(target).position));

        addNodes(intnetNode);
        addEdgeToFlow({ source: target, target: intnetNode.id });
        addEdgeToFlow({ source: source, target: intnetNode.id });
    },
        [setEdges]
    );

    // PRESETS

    const loadPreset = async (id) => {
        const preset = await get(`/network/preset/${id}`, authOptions);
        const functions = getFunctionsFromPreset(preset);
        if (functions) runPreset(functions, preset);
    }

    const getFunctionsFromPreset = (preset) => {
        if (!preset?.data) return;

        const getVariables = () => {
            if (!preset?.data?.variables) return {};
            try{
                return Object.entries(preset.data.variables).reduce((acc, [name, value]) => {
                    acc[name] = new Function(
                        `{${Object.keys(acc).join()}}, machinesLength`,
                        `return ${value}`
                    )(acc, safeObjectValues(machines).length);
                    return acc;
                }, {});
            }
            catch (error) {
                scriptError(error, { title: `Wystąpił błąd w algorytmie konfiguracji "${preset.name}"`, id: 'preset-error' });
                return {};
            }
        }

        const variables = getVariables();
        const params = `{id, group_member_id, group}, i, {${Object.keys(variables).join()}}`;
        const getFunc = (name) => (machine, i) => new Function(params, `return ${preset.data[name]}`)(machine, i, variables);

        const getIntnet = getFunc('getIntnet')
        const getPosX = getFunc('getPosX');
        const getPosY = getFunc('getPosY');

        return { getIntnet, getPosX, getPosY };
    }

    const runPreset = ({ getIntnet, getPosX, getPosY }, preset) => {
        let nodes = [];
        let intnets = {};

        const addToIntnet = (intnetId, machineId) => {
            if (!intnets[intnetId]) intnets[intnetId] = { id: intnetId, machines: [] };
            intnets[intnetId].machines.push(machineId)
        }

        safeObjectValues(machines).forEach((machine, i) => {
            try {
                addToIntnet(getIntnet(machine, i), machine.id);
                nodes.push({
                    id: `machine-${machine.id}`,
                    position: {
                        x: (getPosX(machine, i)) ?? 0,
                        y: (getPosY(machine, i)) ?? 0,
                    }
                })
            }
            catch (error) {
                scriptError(error, { title: `Wystąpił błąd w algorytmie konfiguracji "${preset.name}"`, id: 'preset-error' })
            }

        })

        safeObjectValues(intnets).forEach(intnet => {
            nodes.push({
                id: `intnet-${intnet.id}`,
                position: calcMiddlePosition(...intnet.machines.map(machineId =>
                    nodes.find(node => node.id === `machine-${machineId}`).position)
                ),
            })
        })
        loadFlowWithIntnets({ nodes }, intnets, true).then(() => setIsDirty(true));
    }

    // SNAPSHOTS

    const getSnapshotData = useCallback(() => {
            const {edges: _, ...snapshotData} = rfInstance.toObject();
            return snapshotData;
        }, [rfInstance]
    );
        
    const takeSnapshot = (name) => ({...getSnapshotData(), name: name, intnets: getIntnetConfig()})
    const postSnapshot = (name) => post('/network/snapshot', JSON.stringify(takeSnapshot(name)), authOptions);

    const loadSnapshot = async (id) => {
        const { name, intnets, ...flow } = await get(`/network/snapshot/${id}`, authOptions);
        return loadFlowWithIntnets(flow, intnets);
    }

    // INTNET CONFIG

    const getIntnetConfig = () => 
        getEdges().reduce((acc, { source, target }) => {
            const [intnetId, machineId] = [getIdFromNodeId(target), getIdFromNodeId(source)];

            if (intnetId !== null && machineId !== null) {
                if (!acc[intnetId]) acc[intnetId] = { id: intnetId, machines: [] };
                acc[intnetId].machines.push(machineId);
            }

            return acc;
        }, {})
    ;

    // FLOW

    const loadFlowWithIntnets = async (flow, intnets, resetViewport = true) =>
        new Promise(async (resolve, reject) => {
            if (!flow || !intnets) return reject('Either flow or intnets is undefined.');

            if (resetViewport) setViewport({ x: 0, y: 0, zoom: 1, ...flow.viewport });
            const positions = extractPositionsFromNodes(flow?.nodes);
            setNodes([]);
            setEdges([]);
            createMachineNodes(positions);
            createFlowNodes(NODE_TYPES.intnet, safeObjectValues(intnets), positions);
            createIntnetEdges(intnets);

            allocator.setCurrent(Math.max(...Object.keys(intnets || {})));
            resolve();
        }
        );

    const resetFlow = async (resetViewport = true) => {
        const { intnets, ...flow } = await get('/network/configuration', authOptions);
        return loadFlowWithIntnets(flow, intnets, resetViewport);
    };

    const initFlow = useCallback(() => {
        resetFlow()
            .then(() => {
                notifications.show({
                    id: 'flow-init',
                    color: 'suse-green',
                    title: 'Załadowano konfigurację sieciową',
                    message: `Pomyślnie utworzono reprezentację obecnej konfiguracji sieci wewnętrznych i maszyn.`
                })
                setIsDirty(null);
            })
            .catch((error) => console.error(error));
    }, [resetFlow])

    const createFlowNodes = (nodeType, data = [], positions) => {
        if (noneOrEmpty(data) || !nodeType) return;
        const getPos = (id) => positions[getNodeId(nodeType, id)] ?? generateNewPos();
        addNodes(data.map(node =>
            createNode(nodeType, node, getPos(node.id))
        ));
    }

    const createMachineNodes = (positions) => createFlowNodes(NODE_TYPES.machine, safeObjectValues(machines), positions);

    const createIntnetEdges = (intnets) => {
        if (!intnets) return;

        safeObjectValues(intnets).forEach(
            ({ machines, id }) => machines ?
                machines.forEach(machineId =>
                    addEdgeToFlow({
                        source: getNodeId(NODE_TYPES.machine, machineId),
                        target: getNodeId(NODE_TYPES.intnet, id),
                    })
                )
                : null,
        )
    }

    const applyNetworkConfig = (_) => {
        const stateResponse = putFlowState(getSnapshotData());

        if(stateResponse) notifications.show({
            id: 'flow-init',
            color: 'suse-green',
            title: 'Zapisano obecny stan panelu',
            message: `Pomyślnie zapisano pozycje maszyn na planszy.`
        })

        const networkConfigResponse = putIntnetConfiguration();

        if(networkConfigResponse) notifications.show({
            id: 'flow-init',
            color: 'suse-green',
            title: 'Zastosowano konfigurację sieciową',
            message: `Pomyślnie zastosowano konfigurację sieci w maszynach wirtualnych.`
        })

        setIsDirty(false);
    }

    // APPLY CHANGES REQUESTS

    const putFlowState = (state) => put('/network/configuration/panelstate', JSON.stringify(state), authOptions);
    const putIntnetConfiguration = () => put('/network/configuration/intnets', JSON.stringify(getIntnetConfig()), authOptions);

    //

    useEffect(initFlow, [machines])

    if (machinesLoading) return;
    if (machinesError) {
        requestResponseError(machinesError);
        return;
    }

    return (
        <>
            <Prompt when={isDirty} />
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
                        runPresetButtonProps={{ machines, loadFlowWithIntnets }}
                        addSnapshotButtonProps={{ postSnapshot }}
                        applyNetworkConfig={applyNetworkConfig}
                        resetFlow={resetFlow}
                        isDirty={isDirty}
                        selectProps={{ loadSnapshot, loadPreset, authOptions }}
                    />
                    <Controls />
                    <MiniMap nodeStrokeWidth={3} pannable zoomable />
                    <Background />
                </ReactFlow>
            </Container>
        </>
    )
}

export default function NetworkPanel(props) {
    return (
        <ReactFlowProvider>
            <Flow {...props} />
        </ReactFlowProvider>
    )
}