import { useEffect, useState } from "react";
import { Paper, ScrollArea, Stack } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import CardGroup from "./components/CardGroup/CardGroup.jsx";
import MachineCard from "./components/MachineCard/MachineCard.jsx";
import MachineListPanel from "./components/MachineListPanel/MachineListPanel.jsx";
import useFetch from "../../hooks/useFetch.jsx";
import useAuth from "../../hooks/useAuth.jsx";
import useApi from "../../hooks/useApi.jsx";
import classes from './MachineList.module.css';

const mergeObjectPropertiesToArray = (a, b) =>
    Object.keys({ ...a, ...b })?.map(key => ({ ...a[key], ...b[key] }));

export default function MachineList() {
    const { getRequest } = useApi();
    const { authOptions } = useAuth();
    const navigate = useNavigate();

    const { loading: networkDataLoading, error: networkDataError, data: networkData } = useFetch('/vm/all/networkdata', authOptions)
    const [stateData, setStateData] = useState([]);

    const loadState = async () => setStateData(await getRequest(`vm/all/state`, authOptions));

    useEffect(() => {
        const timeout = setInterval(loadState, 500);
        return () => clearInterval(timeout);
    }, []);


    if (networkDataLoading) return;
    if (networkDataError) throw (networkDataError);

    const virtualMachines = mergeObjectPropertiesToArray(networkData, []);

    const getMachineCard = (machine) => {
        if(!machine) return;

        return (
            <MachineCard
                machine={machine}
                to={`./${machine.uuid}`}
                navigate={navigate}
                key={machine.uuid}
                currentState={stateData?.[machine.uuid]}
            />
        )
    }

    const getGroupedMemberCards = (by = 'group') =>
        virtualMachines.reduce((acc, machine) => {
            if (!acc[machine[by]]) acc[machine[by]] = [];

            acc[machine[by]].push(getMachineCard(machine));
            return acc;
        }, {});

    return (
        <Paper className={classes.pagePaper} bd='solid var(--mantine-color-dark-6) 2px'>
            <Stack flex='1' gap='0'>
                <MachineListPanel />
                <ScrollArea.Autosize pt='sm' pr='4' pb='4'>
                    <Stack pb='lg'>
                        {
                            Object.entries(getGroupedMemberCards('group')).map(
                                ([group, cards], i) => (
                                    <CardGroup key={i} group={group}>
                                        {cards}
                                    </CardGroup>
                                )
                            )
                        }
                    </Stack>
                </ScrollArea.Autosize>
            </Stack>
        </Paper>
    )
}
