import { useEffect, useMemo } from "react";
import { useCookies } from "react-cookie";
import { Paper, ScrollArea, Stack } from "@mantine/core";
import { mergeObjectPropertiesToArray, toggleInArray } from "../../utils/misc.js";
import groupMachines from "./groupMachines.js";
import CardGroup from "./components/CardGroup/CardGroup.jsx";
import MachineCard from "./components/MachineCard/MachineCard.jsx";
import MachineListPanel from "./components/MachineListPanel/MachineListPanel.jsx";
import useFetch from "../../hooks/useFetch.jsx";
import useAuth from "../../hooks/useAuth.jsx";
import useErrorHandler from "../../hooks/useErrorHandler.jsx";
import classes from './MachineList.module.css';

export default function MachineList() {
    const { authOptions } = useAuth();
    const { showErrorNotification } = useErrorHandler();

    // fetch network and state data
    const { loading: networkDataLoading, error: networkDataError, data: networkData, refresh: refreshNetworkData } = useFetch('/vm/all/networkdata', authOptions);
    const { error: stateError, data: stateData, refresh: loadState } =  useFetch('/vm/all/state', authOptions);
    
    // manage cookies
    const [cookies, setCookies] = useCookies(['groupBy', 'openedGroups']);
    const groupBy = cookies.groupBy || 'group';
    const openedGroups = cookies.openedGroups || [];

    // setters for cookies
    const clearOpenedGroups = () => setCookies('openedGroups', [], {path: '/virtual-machines'})
    const toggleGroup = (group) => setCookies('openedGroups', toggleInArray(openedGroups, group) , {path: '/virtual-machines'});
    const setGroupBy = (val) => {
        setCookies('groupBy', val, {path: '/virtual-machines'})
        clearOpenedGroups();
    }
    
    // refresh machine state
    useEffect(() => {
        const timeout = setInterval(loadState, 1000);
        return () => clearInterval(timeout);
    }, []);

    // array of machines storing values from both networkData and stateData
    const machines = mergeObjectPropertiesToArray(networkData, stateData);

    // uses memo to not recalculate groups every time the machine state changes (except for when the groups are based on the state values)
    const groups = useMemo(() => groupMachines(machines, groupBy), [networkData, groupBy, groupBy === 'state' ? stateData : undefined]);

    // error handling
    if (networkDataLoading) return;
    if (networkDataError) throw networkDataError;
    if (stateError) {
        showErrorNotification({title: 'Could not load the machines\' state', description: 'An error occured during fetching the machines\'s state data.'});
        return;
    }

    const getMachineCard = (machine) => (
        <MachineCard
            machine={machine}
            to={`./${machine.uuid}`}
            key={machine.uuid}
            currentState={stateData?.[machine.uuid]}
        />
    )

    const cardGroups = Object.entries(groups).map(([group, machines], i) => (
        <CardGroup 
            key={i} 
            group={group} 
            toggleOpened={() => toggleGroup(group)}
            opened={openedGroups?.includes?.(group)}
        >
            {machines.map(machine => getMachineCard(machine))}
        </CardGroup>
    ))

    return (
        <Paper className={classes.pagePaper}>
            <Stack className={classes.pageStack}>
                <MachineListPanel 
                    groupBy={groupBy} 
                    setGroupBy={setGroupBy}
                    refreshNetworkData
                />
                <ScrollArea.Autosize className={classes.scrollArea} >
                    <Stack pb='lg'>
                        {cardGroups}
                    </Stack>
                </ScrollArea.Autosize>
            </Stack>
        </Paper>
    )
}
