import { Button, Divider, Group, Paper, Stack, Title } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import CardGroup from "./components/CardGroup/CardGroup.jsx";
import MachineCard from "./components/MachineCard/MachineCard.jsx";
import useAuth from "../../hooks/useAuth.jsx";
import useFetch from "../../hooks/useFetch.jsx";
import useErrorHandler from "../../hooks/useErrorHandler.jsx";
import { IconLayoutBottombarFilled, IconLayoutGridFilled, IconLayoutListFilled, IconRelationManyToManyFilled } from "@tabler/icons-react";
import { useState } from "react";
import { useLocalStorage } from "@mantine/hooks";

const mergeObjectPropertiesToArray = (a, b) =>
    Object.keys({ ...a, ...b })?.map(key => ({...a[key], ...b[key]}));

export default function MachineList() {
    const [layout, setLayout] = useLocalStorage({key: `machineListLayout`, defaultValue: 'grid'});
    const {authOptions} = useAuth();
    const errorHandler = useErrorHandler();
    const navigate = useNavigate();
    const {loading: networkDataLoading, error: networkDataError, data: networkData} = useFetch('/vm/all/networkdata', authOptions)
    const {loading: stateDataLoading, error: stateDataError, data: stateData} = useFetch('/vm/all/state', authOptions)

    if(networkDataLoading || stateDataLoading) return;
    if(networkDataError || stateDataError) {
        errorHandler.requestResponseError(networkDataError || stateDataError);
        return;
    }

    const virtualMachines = mergeObjectPropertiesToArray(networkData, stateData);

    const getMachineCard = (machine) => (
        <MachineCard 
            machine={machine} 
            to={`./${machine.id}`} 
            navigate={navigate}
            key={machine.id}
        />
    )

    const getGroupedMemberCards = (by = 'group') => 
        virtualMachines.reduce((acc, machine) => {
            if (!acc[machine[by]]) acc[machine[by]] = [];

            acc[machine[by]].push(getMachineCard(machine));
            return acc;
        }, {});

    return (
        <Stack>
            <Group justify="space-between">
                <Title order={3} pl='xs'></Title>
                <Button.Group>
                    <Button
                        disabled={layout === 'grid'} 
                        onClick={() => setLayout('grid')} 
                        variant='default'
                        size='md' 
                        p={'xs'}
                    >
                        <IconLayoutGridFilled/>
                    </Button>
                    <Button 
                        disabled={layout === 'pairs'} 
                        onClick={() => setLayout('pairs')} 
                        variant='default' 
                        size='md' 
                        p={'xs'}
                    >
                        <IconRelationManyToManyFilled/>
                    </Button>
                </Button.Group>
            </Group>
            {
                layout === 'grid' ? Object.entries(getGroupedMemberCards('group')).map(
                    ([group, cards], i) => (
                        <CardGroup 
                            key={i} 
                            group={group}
                        >
                            {cards}
                        </CardGroup>
                    )
                ) :
                layout === 'pairs' ? Object.entries(getGroupedMemberCards('group_member_id')).map(
                    ([memberId, pair], i) => (
                        <Stack key={i}>
                            <Paper 
                                withBorder 
                                p='sm' 
                                bg='dark.6'
                            >
                                <Title pl='xs' order={2}>Stanowisko {memberId}</Title>
                            </Paper>
                            <Group grow>
                                {pair}
                            </Group>
                        </Stack>
                    )
                ) : null
            }
        </Stack>        
    )
}
