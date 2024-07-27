import { Badge, Grid, Group, Paper, Progress, Table, Text, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import get from "../../api/get";
import { IconPlayerPlayFilled, IconPlayerStopFilled } from "@tabler/icons-react";
import { showError } from "../../systems/notifications";

export default function MachinePage({authFetch, authOptions}) {
    const {id} = useParams();

    const {loading: loading, error: error, data: networkData} = authFetch(`/vm/${id}/networkdata`);
    const [state, setState] = useState({});

    const handleError = (err) => {
        if(err?.status == 401) return navigate('/login');
        showError({title: 'Wystąpił bład', message: 'Nie udało się pobrać informacji o maszynie'})
    }

    const handleBadgeClick = () => {}

    const loadState = () => {
        get(`vm/${id}/state`, authOptions)
        .then(res => res.ok ? res.json() : handleError(res))
        .then(json => setState(json))
        .catch(err => handleError(err))
    }

    useEffect(() => {
        const interval = setInterval(() => loadState(), 1000)
        return () => clearInterval(interval)
    }, []);

    if (loading) return;
    if (error) handleError(error);

    return (
        <Grid h='100%'>
            <Grid.Col span={6}>
                <Paper p='md' withBorder>
                    <Group justify="space-between" pl='sm' pr='md'>
                        <Title order={1}>Maszyna {networkData.id}</Title>
                        <Badge 
                            onClick={handleBadgeClick}
                            size='xl'
                            color={state?.active ? 'suse-green' : 'red.6'} 
                            variant={state?.active ? 'filled' : 'outline'} 
                            leftSection={state?.active ? <IconPlayerPlayFilled size='16'/> : <IconPlayerStopFilled size='16'/>}
                        >
                            {state?.active ? 'on' : 'off'}
                        </Badge>
                    </Group>
                </Paper>
            </Grid.Col>
            <Grid.Col span={6}>
                <Paper p='md' withBorder></Paper>
            </Grid.Col>
            <Grid.Col span={12}>
                <Paper p='md' withBorder>
                    <Table striped withTableBorder>
                        <Table.Tbody>
                            <Table.Tr>
                                <Table.Td><Text fw={500}>CPU</Text></Table.Td>
                                <Table.Td><Progress value={state?.cpu ?? 0} transitionDuration={200}/></Table.Td>
                                <Table.Td>{state?.cpu}%</Table.Td>
                            </Table.Tr>
                            <Table.Tr>
                                <Table.Td>RAM</Table.Td>
                                <Table.Td><Progress value={state?.ram_used * 100 / state?.ram_max ?? 0} transitionDuration={200}/></Table.Td>
                                <Table.Td>{state?.ram_used}MB / {state?.ram_max}MB</Table.Td>
                            </Table.Tr>
                        </Table.Tbody>
                    </Table>
                </Paper>
            </Grid.Col>
        </Grid>
    )
}
