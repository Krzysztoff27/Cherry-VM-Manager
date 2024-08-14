import { Badge, Grid, Group, List, ListItem, Paper, Progress, Space, Stack, Table, TableTbody, Text, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import get from "../../api/get";
import { IconDeviceDesktop, IconDeviceDesktopOff, IconPlayerPlayFilled, IconPlayerStopFilled, IconServer, IconServerOff } from "@tabler/icons-react";
import { showError } from "../../handlers/notifications";
import StateBadge from "../../components/StateBadge/StateBadge";

export default function MachinePage({authFetch, authOptions}) {
    const {id} = useParams();

    const {loading: loading, error: error, data: machine} = authFetch(`/vm/${id}/networkdata`);
    const [state, setState] = useState({loading: true});

    const handleError = (err) => {
        if(err?.status == 401) return navigate('/login');
        showError({title: 'Nie udało się pobrać informacji o maszynie', message: 'Spróbuj odświeżyć stronę lub zalogować się ponownie'})
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
                    <Stack>
                        <Group justify="space-between" pl='lg' pr='lg'>
                            <Group align="center">
                                {
                                    machine.group === 'desktop' ? state.active ? <IconDeviceDesktop size='40'/> : <IconDeviceDesktopOff size='40'/> :
                                    machine.group === 'serwer'  ? state.active ? <IconServer size='40'/> : <IconServerOff size='40'/> : null
                                }
                                <Title order={1} align="center">
                                    Maszyna {machine.id}
                                </Title>
                            </Group>
                            
                            <StateBadge machineState={state} onClick={handleBadgeClick} sizes={{badge: 'xl', loader: 'md', icon: 15}}/>
                        </Group>
                        <Table fz='lg' withRowBorders={false} striped>
                            <Table.Tbody>
                                <Table.Tr>
                                    <Table.Td ta='right' fw={500} w='12.5%'>Grupa: </Table.Td>
                                    <Table.Td tt="capitalize">{`${machine.group} (${machine.group_member_id})`}</Table.Td>
                                </Table.Tr>
                                <Table.Tr>
                                    <Table.Td ta='right' fw={500}>Domena: </Table.Td>
                                    <Table.Td><a href={`http://${machine.domain}`} target='_blank'>{machine.domain}</a></Table.Td>
                                </Table.Tr>
                                <Table.Tr>
                                    <Table.Td ta='right' fw={500}>Adres: </Table.Td>
                                    <Table.Td><a href={`http://172.16.100.1:${machine.port}`} target='_blank'>172.16.100.1:{machine.port}</a></Table.Td>
                                </Table.Tr>
                            </Table.Tbody>
                        </Table>
                    </Stack>
                </Paper>
            </Grid.Col>
            <Grid.Col span={6}>
                <Paper p='md' withBorder>
                    <Stack>
                        <Title order={3}>Stan maszyny</Title>
                        <Paper radius='md' withBorder>
                            <Table>
                                <Table.Tbody>
                                    <Table.Tr>
                                        <Table.Td ta='right' w='15%'>CPU</Table.Td>
                                        <Table.Td w='50%'><Progress value={state?.cpu ?? 0} transitionDuration={200}/></Table.Td>
                                        <Table.Td w='35%'>{state?.cpu}%</Table.Td>
                                    </Table.Tr>
                                    <Table.Tr>
                                        <Table.Td ta='right'>RAM</Table.Td>
                                        <Table.Td><Progress value={state?.ram_used * 100 / state?.ram_max} transitionDuration={300}/></Table.Td>
                                        <Table.Td>{state?.ram_used}/{state?.ram_max} MB</Table.Td>
                                    </Table.Tr>
                                </Table.Tbody>
                            </Table>
                        </Paper>
                    </Stack>  
                </Paper>
            </Grid.Col>
        </Grid>
    )
}