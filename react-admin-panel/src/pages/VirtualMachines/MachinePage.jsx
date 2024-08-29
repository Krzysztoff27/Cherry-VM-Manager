import { Grid, Group, Paper, Progress, Stack, Table, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { IconDeviceDesktop, IconDeviceDesktopOff, IconServer, IconServerOff } from "@tabler/icons-react";

import StateBadge from "../../components/StateBadge/StateBadge";
import useAuth from "../../hooks/useAuth";
import useFetch from "../../hooks/useFetch";
import useApi from "../../hooks/useApi";
import useErrorHandler from "../../hooks/useErrorHandler";

export default function MachinePage() {
    const {get} = useApi();
    const {authOptions} = useAuth();
    const {id} = useParams();
    const errorHandler = useErrorHandler();

    const {loading, error, data: machine} = useFetch(`/vm/${id}/networkdata`, authOptions);
    const [state, setState] = useState({loading: true});

    const handleBadgeClick = () => {}

    const loadState = () => {
        setState(get(`vm/${id}/state`, authOptions))
    }

    useEffect(() => {
        const interval = setInterval(() => loadState(), 1000)
        return () => clearInterval(interval)
    }, []);

    if (loading) return;
    if (error) throw error;

    return (
        <Grid h='100%'>
            <Grid.Col span={6}>
                <Paper p='md' withBorder>
                    <Stack>
                        <Group justify="space-between" pl='lg' pr='lg'>
                            <Group align="center">
                                {
                                    machine.group === 'desktop' ? state.active ? <IconDeviceDesktop size='40'/> : <IconDeviceDesktopOff size='40'/> :
                                    machine.group === 'server'  ? state.active ? <IconServer size='40'/> : <IconServerOff size='40'/> : null
                                }
                                <Title order={1} align="center">
                                    Machine {machine.id}
                                </Title>
                            </Group>
                            
                            <StateBadge machineState={state} onClick={handleBadgeClick} sizes={{badge: 'xl', loader: 'md', icon: 15}}/>
                        </Group>
                        <Table fz='lg' withRowBorders={false} striped>
                            <Table.Tbody>
                                <Table.Tr>
                                    <Table.Td ta='right' fw={500} w='12.5%'>Type: </Table.Td>
                                    <Table.Td tt="capitalize">{`${machine.group} (${machine.group_member_id})`}</Table.Td>
                                </Table.Tr>
                                <Table.Tr>
                                    <Table.Td ta='right' fw={500}>Domain: </Table.Td>
                                    <Table.Td><a href={`http://${machine.domain}`} target='_blank'>{machine.domain}</a></Table.Td>
                                </Table.Tr>
                                <Table.Tr>
                                    <Table.Td ta='right' fw={500}>Adress: </Table.Td>
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
                        <Title order={3}>Machine state</Title>
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
