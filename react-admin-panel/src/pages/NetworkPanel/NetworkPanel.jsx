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
import Prompt from '../../components/Prompt/Prompt';

import useAuth from '../../hooks/useAuth';
import useFetch from '../../hooks/useFetch';
import useApi from '../../hooks/useApi';
import useFlowPresets from '../../hooks/useFlowPresets';
import useErrorHandler from '../../hooks/useErrorHandler';

import { noneOrEmpty, safeObjectValues } from '../../utils/misc';
import { calcMiddlePosition, sliceNodeIdToId, getNodeId, extractPositionsFromNodes } from '../../utils/reactFlow';
import { v4 as uuidv4 } from 'uuid';

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


/**
 * @typedef {string} Uuid - UUIDv4 identifier
 * 
 * @typedef {Object} Position
 * @property {number} x - x coordinate of the node
 * @property {number} y - y coordinate of the node
 * 
 * @typedef {Object} Machine
 * @property {Uuid} uuid - Unique identifier of the machine
 * @property {string} group - Group the machine belongs to (e.g., 'desktop', 'server')
 * @property {number} group_member_id - Unique membership ID for each member in the group
 * @property {number} port - Port the machine uses
 * @property {string} domain - Domain mapped to the machine
 * 
 * @typedef {Object} Intnet
 * @property {Uuid} uuid - Unique identifier of the internal network
 * @property {number} number - Unique number of the internal network displayed to the user
 * @property {string[]} machines - UUIDs of the machines connected to the internal network
 * 
 * @typedef {Object} Flow
 * @property {(MachineNode|IntnetNode)[]} nodes - An array containing node objects
 * 
 * @typedef {Object<Uuid, Intnet>} Intnets - Object storing all the intnets by their UUIDs.
 */

/**
 * Creates a node based on the provided data and type.
 * @param {MachineNode|IntnetNode} type - Type of node to be created
 * @param {Object} data - Data required for the node's creation
 * @param {Position} position - Position of the node
 * @returns {MachineNode|IntnetNode} - The created node
 */
const createNode = (type, data, position) => {
    switch (type) {
        case MachineNode: return createMachineNode(data, position);
        case IntnetNode: return createIntnetNode(data, position);
        default: return {};
    }
}

/**
 * Creates a flow node representing a virtual machine.
 * @param {Machine} machine - The machine the node will represent
 * @param {Position} position - Position of the node in the flow
 * @returns {Object} - Node configuration object
 */
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

/**
 * Creates a flow node representing an internal network.
 * @param {Intnet} intnet - The internal network the node will represent
 * @param {Position} position - Position of the node in the flow
 * @returns {Object} - Node configuration object
 */
const createIntnetNode = (intnet, position) => ({
    id: getNodeId(NODE_TYPES.intnet, intnet.uuid),
    type: 'intnet',
    intnet: intnet.uuid,
    position: position,
    data: {
        label: `Intnet ${intnet.number ?? intnet.uuid.substring(0, 4)}`
    },
})

const newPositionsAllocator = new NumberAllocator();
const generateNewPos = () => ({ x: newPositionsAllocator.getNext() * 100, y: 0 });

/**
 * Main component for managing the network flow visualization.
 * Handles nodes, edges, configurations, snapshots, and presets.
 * 
 * @returns {JSX.Element} Flow component
 */
function Flow() {
    const { authOptions } = useAuth();
    const { getRequest, postRequest, putRequest } = useApi();
    const { generateConfigFromPreset } = useFlowPresets();
    const { showErrorNotification } = useErrorHandler();

    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [rfInstance, setRfInstance] = useState(null);
    const { getNode, getEdges, zoomTo, getZoom, setCenter } = useReactFlow();
    const intnetAllocator = useRef(new NumberAllocator()).current;

    /**
     * [isDirty]
     * true - unsaved changes
     * false - no unsaved changes
     * null - no unsaved changes and just loaded
     */
    const [isDirty, setIsDirty] = useState(null);

    const { loading: machinesLoading, error: machinesError, data: machines, refresh: refreshMachines } = useFetch('/vm/all/networkdata', authOptions);

    /**
     * Adds new nodes to the flow.
     * @param  {...any} nodes - New nodes to be added
     */
    const addNodes = (...nodes) => setNodes(nds => [...nds, ...nodes.flat()]);

    /**
     * Adds an edge between nodes in the flow.
     * @param {Object} edge - The edge to be added
     */
    const addEdgeToFlow = (edge) => setEdges(eds => addEdge(edge, eds));

    // NODES AND EDGES

    /**
     * Handles changes to nodes in the flow.
     * Marks the flow as unsaved (dirty) if changes are made.
     * @param {Array} changes - The node changes
     */
    const onNodesChange = useCallback((changes) => {
        setNodes((nds) => applyNodeChanges(changes, nds));
        if (changes && !changes.every(e => e.type === 'dimensions')) setIsDirty(true);
    }, [],
    );

    /**
     * Handles the deletion of nodes from the flow.
     * When deleting an intnet node, removes the intnet number from the allocator, 
     * allowing for future intnets to use its number.
     * @param {Array} deletedNodes - The nodes that were deleted
     */
    const onNodesDelete = useCallback((deletedNodes) =>
        deletedNodes.forEach(node => intnetAllocator.remove(node?.intnet)), []
    );

    /**
     * Handles changes to edges in the flow.
     * Marks the flow as unsaved (dirty).
     * @param {Array} changes - The edge changes
     */
    const onEdgesChange = useCallback((changes) => {
        setEdges((eds) => applyEdgeChanges(changes, eds));
        setIsDirty(true);
    }, [],
    );

    // CONNECT

    /**
    * Handles connection events between nodes.
    * When connecting a machine to another machine, it automatically creates a new internal network between them.
    * @param {Object} params - The connection parameters
    */
    const onConnect = useCallback(({ source, target }) => {
        if (source.startsWith('intnet')) return;
        if (target.startsWith('intnet')) return addEdgeToFlow({ source: source, target: target });

        const number = intnetAllocator.getNext();
        const intnetNode = createIntnetNode({ uuid: uuidv4(), number: number }, calcMiddlePosition(getNode(source).position, getNode(target).position));

        addNodes(intnetNode);
        addEdgeToFlow({ source: target, target: intnetNode.id });
        addEdgeToFlow({ source: source, target: intnetNode.id });
    }, [setEdges]);

    // PRESETS

    /**
     * Loads a network preset and applies it to the flow.
     * @param {string} uuid - The unique identifier of the preset to load
     */
    const loadPreset = async (uuid) => {
        const preset = await getRequest(`/network/preset/${uuid}`, authOptions);
        const config = generateConfigFromPreset(preset, machines);
        if (!config) return;

        loadFlowWithIntnets(config.flow, config.intnets, true).then(() => setIsDirty(true));
    }

    // SNAPSHOTS

    /**
     * Returns the current snapshot data of the flow.
     * @returns {Flow} Snapshot data
     */
    const getSnapshotData = useCallback(() => {
        const { edges: _, viewport: __, ...snapshotData } = rfInstance.toObject();
        return snapshotData;
    }, [rfInstance]);

    /**
     * Takes a snapshot of the current flow and assigns it a name.
     * @param {string} name - The name of the snapshot
     * @returns {Object} The snapshot object
     */
    const takeSnapshot = (name) => ({ ...getSnapshotData(), name: name, intnets: getIntnetConfig() });

    /**
    * Sends a POST request to save the current snapshot of the flow.
    * @param {string} name - The name of the snapshot
    * @param {Flow} snapshotData - The snapshot data
    */
    const postSnapshot = (name, errorCallback = undefined) => postRequest('/network/snapshot', JSON.stringify(takeSnapshot(name)), authOptions, errorCallback);

    /**
     * Loads a flow snapshot by its uuid.
     * @param {string} uuid - The uuid of the snapshot to load
     */
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

    /**
     * Loads the flow and internal networks into the React Flow panel.
     * @param {Flow} flow - The flow data
     * @param {Intnets} intnets - The internal networks (intnets) data
     * @returns {Promise} - Resolves once the flow and intnets are loaded
     */
    const loadFlowWithIntnets = async (flow, intnets) => (
        new Promise(async (resolve, reject) => {
            if (!flow || !intnets) return reject('Either flow or intnets is undefined.');

            const positions = extractPositionsFromNodes(flow?.nodes);
            const center = calcMiddlePosition(...safeObjectValues(positions))

            // adding half the node width
            setCenter(center.x + 50, center.y);
            zoomTo(getZoom() - 0.5, { duration: 500 })

            setNodes([]);
            setEdges([]);
            createMachineNodes(positions);
            createFlowNodes(NODE_TYPES.intnet, safeObjectValues(intnets), positions);
            createIntnetEdges(intnets);
            intnetAllocator.setCurrent(Math.max(...safeObjectValues(intnets).map(e => e.number), 0));
            newPositionsAllocator.setCurrent(0);
            resolve();
        })
    );

    /**
     * Resets the flow to the current network configuration from the backend.
     * @returns {Promise} - Resolves once the flow is reset
     */
    const resetFlow = async () => {
        const { intnets, ...flow } = await getRequest('/network/configuration', authOptions);
        return loadFlowWithIntnets(flow, intnets);
    };

    /**
     * Initializes the flow by resetting it and loading the network configuration.
     */
    const initFlow = useCallback(() => {
        resetFlow()
            .then(() => {
                notifications.hide(`flow-init`);
                notifications.show({
                    id: `flow-init`,
                    color: 'suse-green',
                    title: 'Network Configuration Loaded',
                    message: `Successfully created a representation of the present configuration of internal networks.`
                });
                setIsDirty(null);
            })
            .catch(() => showErrorNotification({
                title: 'Couldn\'t Load the Network Configuration', 
                message: 'Error occurred during load due to invalid configuration.'
            }));
    }, [resetFlow])

    /**
     * Creates flow nodes from the provided data. Creates one node for each element in the data array and assigns its position based on the
     * positions given. If node is not present in the <positions> object, its position is automatically generated.
     * @param {MachineNode|IntnetNode} nodeType - Type of the nodes to be created
     * @param {Machine[]|Intnet[]} data - Depending on the node type, data provided can either be array of machines or array of intnets. 
     * @param {Object.<Uuid, Position>} positions - An object containing positions of the nodes mapped to their UUIDs
     */
    const createFlowNodes = (nodeType, data = [], positions) => {
        if (noneOrEmpty(data) || !nodeType) return;
        const getPos = (uuid) => positions[getNodeId(nodeType, uuid)] ?? generateNewPos();

        addNodes(data.map(node => createNode(nodeType, node, getPos(node.uuid))));
    }

    /**
     * Uses createFlowNodes function to create machine nodes based on the currently loaded machines and provided positions for them.
     * @param {Object.<Uuid, Position>} positions - An object containing positions of the nodes mapped to their UUIDs
     */
    const createMachineNodes = (positions) => createFlowNodes(NODE_TYPES.machine, safeObjectValues(machines), positions);

    /**
     * Creates edges between machine nodes and intnet nodes based on the intnet configuration.
     * Machines present in the intnet's "machines" property will have a connection to the intnet created.
     * @param {*} intnets 
     * @returns 
     */
    const createIntnetEdges = (intnets) => {
        if (!intnets) return;

        safeObjectValues(intnets).forEach(({ uuid, machines }) => machines ?
            machines.forEach(machineUuid =>
                addEdgeToFlow({
                    source: getNodeId(NODE_TYPES.machine, machineUuid),
                    target: getNodeId(NODE_TYPES.intnet, uuid),
                })
            ) : null,
        )
    }

    /**
     * Saves the current flow state and internal network (Intnet) configuration.
     */
    const applyNetworkConfig = (_) => {
        const stateResponse = putFlowState();

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

    /**
     * Sends a PUT request to save the current flow panel state.
     * @returns {Object} - JSON data of the response
     */
    const putFlowState = () => putRequest('/network/configuration/panelstate', JSON.stringify(getSnapshotData()), authOptions);

    /**
     * Sends a PUT request to save the internal network (Intnet) configuration.
     * @returns {Object} - JSON data of the response
     */
    const putIntnetConfiguration = () => putRequest('/network/configuration/intnets', JSON.stringify(getIntnetConfig()), authOptions);

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