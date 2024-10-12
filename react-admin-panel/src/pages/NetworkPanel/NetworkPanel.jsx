import { Container } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceDesktop, IconPlayerRecord, IconServer2 } from '@tabler/icons-react';
import { Background, Controls, MiniMap, ReactFlow, ReactFlowProvider, addEdge, applyEdgeChanges, applyNodeChanges, useReactFlow } from '@xyflow/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import NumberAllocator from '../../handlers/numberAllocator';
import FloatingConnectionLine from './components/Floating/FloatingConnectionLine/FloatingConnectionLine';
import FloatingEdge from './components/Floating/FloatingEdge/FloatingEdge';
import FlowPanel from './components/FlowPanel/FlowPanel';
import IntnetNode from './components/IntnetNode/IntnetNode';
import MachineNode from './components/MachineNode/MachineNode';

import { noneOrEmpty, safeObjectValues } from '../../utils/misc';
import { calcMiddlePosition, sliceNodeIdToId, getNodeId, extractPositionsFromNodes } from '../../utils/reactFlow';

import '@xyflow/react/dist/style.css';
import useAuth from '../../hooks/useAuth';
import useFetch from '../../hooks/useFetch';
import Prompt from '../../components/Prompt/Prompt';
import useApi from '../../hooks/useApi';
import useFlowPresets from '../../hooks/useFlowPresets';

import { v4 as uuidv4 } from 'uuid';

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

/**
 * @typedef {object} Position
 * @property {number} x - x coordinate
 * @property {number} y - y coordinate
 * 
 * @param {MachineNode|IntnetNode} type 
 * @param {object} data - data required for node's creation
 * @param {Position} position 
 * @returns {MachineNode|IntnetNode}
 */
const createNode = (type, data, position) => {
    switch (type) {
        case MachineNode: return createMachineNode(data, position);
        case IntnetNode: return createIntnetNode(data, position);
        default: return {};
    }
}

export const createMachineNode = (machine, position) => ({
    id: getNodeId(NODE_TYPES.machine, machine.uuid),
    type: 'machine',
    position: position,
    deletable: false,
    selectable: false,
    data: {
        label: `${machine.group} ${machine.group_member_id}`,
        icon: (
            machine.group === 'desktop' ? IconDeviceDesktop :
                machine.group === 'server' ? IconServer2 : IconPlayerRecord
        ),
    },
})

const createIntnetNode = (intnet, position) => ({
    id: getNodeId(NODE_TYPES.intnet, intnet.uuid),
    type: 'intnet',
    intnet: intnet.uuid,
    position: position,
    data: {
        label: `Intnet ${intnet.number || intnet.uuid}`
    },
})

const newPositionsAllocator = new NumberAllocator();
const generateNewPos = () => ({ x: newPositionsAllocator.getNext() * 100, y: 0 });

function Flow() {
    const { authOptions } = useAuth();
    const { getRequest, postRequest, putRequest } = useApi();
    const { generateConfigFromPreset } = useFlowPresets();

    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [rfInstance, setRfInstance] = useState(null);
    const { getNode, getEdges, zoomTo, getZoom, setCenter} = useReactFlow();
    const intnetAllocator = useRef(new NumberAllocator()).current;

    /**
     * [isDirty]
     * true - unsaved changes
     * false - no unsaved changes
     * null - no unsaved changes and just loaded
     */
    const [isDirty, setIsDirty] = useState(null);

    const { loading: machinesLoading, error: machinesError, data: machines, refresh: refreshMachines } = useFetch('/vm/all/networkdata', authOptions);

    const addNodes = (...nodes) => setNodes(nds => [...nds, ...nodes.flat()]);
    const addEdgeToFlow = (edge) => setEdges(eds => addEdge(edge, eds));

    // NODES

    const onNodesChange = useCallback((changes) => {
        setNodes((nds) => applyNodeChanges(changes, nds));
        if (changes && !changes.every(e => e.type === 'dimensions')) setIsDirty(true);
    }, [],
    );

    const onNodesDelete = useCallback((deletedNodes) =>
        deletedNodes.forEach(node => intnetAllocator.remove(node?.intnet)), []
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

        const number = intnetAllocator.getNext();
        const intnetNode = createIntnetNode({ uuid: uuidv4(), number: number }, calcMiddlePosition(getNode(source).position, getNode(target).position));

        addNodes(intnetNode);
        addEdgeToFlow({ source: target, target: intnetNode.id });
        addEdgeToFlow({ source: source, target: intnetNode.id });
    },
        [setEdges]
    );

    // PRESETS

    const loadPreset = async (uuid) => {
        const preset = await getRequest(`/network/preset/${uuid}`, authOptions);
        const config = generateConfigFromPreset(preset, machines);
        if (!config) return;

        loadFlowWithIntnets(config.flow, config.intnets, true).then(() => setIsDirty(true));
    }

    // SNAPSHOTS

    const getSnapshotData = useCallback(() => {
        const { edges: _, ...snapshotData } = rfInstance.toObject();
        return snapshotData;
    }, [rfInstance]
    );

    const takeSnapshot = (name) => ({ ...getSnapshotData(), name: name, intnets: getIntnetConfig() })
    const postSnapshot = (name, errorCallback = undefined) => postRequest('/network/snapshot', JSON.stringify(takeSnapshot(name)), authOptions, errorCallback);

    const loadSnapshot = async (uuid) => {
        const data = await getRequest(`/network/snapshot/${uuid}`, authOptions);
        if (!data) return;

        const { name, intnets, ...flow } = data;
        return loadFlowWithIntnets(flow, intnets).then(() => setIsDirty(true));
    }

    // INTNET CONFIG

    const getIntnetConfig = () =>
        getEdges().reduce((acc, { source, target }) => {
            const [intnetUuid, machineUuid] = [sliceNodeIdToId(target), sliceNodeIdToId(source)];

            if (intnetUuid !== null && machineUuid !== null) {
                if (!acc[intnetUuid]) acc[intnetUuid] = { uuid: intnetUuid, machines: [] };
                acc[intnetUuid].machines.push(machineUuid);
            }

            console.log(acc)
            return acc;
        }, {});

    // FLOW

    const loadFlowWithIntnets = async (flow, intnets) =>
        new Promise(async (resolve, reject) => {
            if (!flow || !intnets) return reject('Either flow or intnets is undefined.');

            const positions = extractPositionsFromNodes(flow?.nodes);
            const center = calcMiddlePosition(...safeObjectValues(positions))
            console.log(center.x, center.y)
            
            setCenter(center.x, center.y);
            zoomTo(getZoom() - 1, { duration: 500 });
            
            setNodes([]);
            setEdges([]);
            createMachineNodes(positions);
            createFlowNodes(NODE_TYPES.intnet, safeObjectValues(intnets), positions);
            createIntnetEdges(intnets);
            intnetAllocator.setCurrent(Math.max(...safeObjectValues(intnets).map(e => e.number), 0));
            newPositionsAllocator.setCurrent(0);
            resolve();
        });

    const resetFlow = async () => {
        const { intnets, ...flow } = await getRequest('/network/configuration', authOptions);
        return loadFlowWithIntnets(flow, intnets);
    };

    const initFlow = useCallback(() => {
        resetFlow()
            .then(() => {
                fitView({nodes: nodes})

                notifications.hide(`flow-init`);
                notifications.show({
                    id: `flow-init`,
                    color: 'suse-green',
                    title: 'Network Configuration Loaded',
                    message: `Successfully created a representation of the present configuration of internal networks.`
                });
                setIsDirty(null);
            })
            .catch((error) => console.error(error));
    }, [resetFlow])

    const createFlowNodes = (nodeType, data = [], positions) => {
        if (noneOrEmpty(data) || !nodeType) return;
        const getPos = (uuid) => positions[getNodeId(nodeType, uuid)] ?? generateNewPos();

        addNodes(data.map(node => createNode(nodeType, node, getPos(node.uuid))));
    }

    const createMachineNodes = (positions) => createFlowNodes(NODE_TYPES.machine, safeObjectValues(machines), positions);

    const createIntnetEdges = (intnets) => {
        if (!intnets) return;

        safeObjectValues(intnets).forEach(
            ({ uuid, machines }) => machines ?
                machines.forEach(machineUuid =>
                    addEdgeToFlow({
                        source: getNodeId(NODE_TYPES.machine, machineUuid),
                        target: getNodeId(NODE_TYPES.intnet, uuid),
                    })
                )
                : null,
        )
    }

    const applyNetworkConfig = (_) => {
        const stateResponse = putFlowState(getSnapshotData());

        if (stateResponse) notifications.show({
            id: 'flow-init',
            color: 'suse-green',
            title: 'Saved current panel state',
            message: `Current positions of the nodes in the flow have been successfully saved.`
        })

        const networkConfigResponse = putIntnetConfiguration();

        if (networkConfigResponse) notifications.show({
            id: 'flow-init',
            color: 'suse-green',
            title: 'Saved intnet configuration',
            message: `Network configuration has been successfully updated and saved.`
        })

        setIsDirty(false);
    }

    // APPLY CHANGES REQUESTS

    const putFlowState = (state) => putRequest('/network/configuration/panelstate', JSON.stringify(state), authOptions);
    const putIntnetConfiguration = () => putRequest('/network/configuration/intnets', JSON.stringify(getIntnetConfig()), authOptions);

    //

    useEffect(initFlow, [machines])

    if (machinesLoading) return;
    if (machinesError) throw machinesError;

    return (
        <>
            <Prompt when={isDirty} />
            <Container flex='1' fluid>
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
                        refreshMachines={refreshMachines}
                        applyNetworkConfig={applyNetworkConfig}
                        resetFlow={resetFlow}
                        isDirty={isDirty}
                        loadSnapshot={loadSnapshot}
                        loadPreset={loadPreset}
                        postSnapshot={postSnapshot}
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