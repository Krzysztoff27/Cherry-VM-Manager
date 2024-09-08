import { ActionIcon, Group, rem, ScrollArea, Spoiler, Stack, Table, Text, Title } from "@mantine/core";
import Loading from "../../../../components/Loading/Loading";
import { IconDeviceDesktop, IconDeviceDesktopOff, IconPlayerPlayFilled, IconPlayerStopFilled } from "@tabler/icons-react";
import StateBadge from "../../../../components/StateBadge/StateBadge";
import useFetch from "../../../../hooks/useFetch";
import { arrayIntoChunks } from "../../../../utils/misc";

function MachineTitle({ machine, currentState }) {
    const icon = currentState.active ?
        <IconDeviceDesktop size={'40'} /> :
        <IconDeviceDesktopOff size={'40'} />;

    const handleBadgeClick = () => { }

    return (
        <Group justify="space-between" pl='lg' pr='lg'>
            <Group align="center">
                {icon}
                <Title order={1} align="center">
                    Machine {machine.id}
                </Title>
                <Group gap='sm'>
                    <ActionIcon
                        variant='light'
                        size='lg'
                        color='red.9'
                        disabled={currentState.loading || !currentState.active}
                    >
                        <IconPlayerStopFilled size={'28'} />
                    </ActionIcon>
                    <ActionIcon
                        variant='light'
                        size='lg'
                        color='suse-green.9'
                        disabled={currentState.loading || currentState.active}
                    >
                        <IconPlayerPlayFilled size={'28'} />
                    </ActionIcon>
                </Group>
            </Group>
            <StateBadge machineState={currentState} onClick={handleBadgeClick} sizes={{ badge: 'xl', loader: 'md', icon: 15 }} />
        </Group>
    )
}

function NetworkDataTable({ machine, currentState }) {
    const keyTdStyle = { textAlign: 'right', fontWeight: 500, width: '25%' };

    const activeConnectionsArray = currentState?.active_connections?.map((address, i) => <Text fz='lg' key={i}>{address}</Text>) || [];
    const activeConnectionsSplit = arrayIntoChunks(activeConnectionsArray, 4);
    const activeConnectionsStacks = activeConnectionsSplit.length ? activeConnectionsSplit.map(
        (elements, i) => <Stack gap='sm' key={i}>{...elements}</Stack>
    ) : 'None';
    
    return (
        <ScrollArea>
            <Table fz='lg' withRowBorders={false} striped>
                <Table.Tbody>
                    <Table.Tr>
                        <Table.Td style={keyTdStyle}>Type: </Table.Td>
                        <Table.Td tt="capitalize">{`${machine.group} (${machine.group_member_id})`}</Table.Td>
                    </Table.Tr>
                    <Table.Tr>
                        <Table.Td style={keyTdStyle}>Domain: </Table.Td>
                        <Table.Td><a href={`http://${machine.domain}`}>{machine.domain}</a></Table.Td>
                    </Table.Tr>
                    <Table.Tr>
                        <Table.Td style={keyTdStyle}>Adress: </Table.Td>
                        <Table.Td><a href={`http://172.16.100.1:${machine.port}`}>172.16.100.1:{machine.port}</a></Table.Td>
                    </Table.Tr>
                    <Table.Tr>
                        <Table.Td style={{ verticalAlign: 'top', ...keyTdStyle }}>Active connections: </Table.Td>
                        <Table.Td><Group align='top'>{activeConnectionsStacks}</Group></Table.Td>
                    </Table.Tr>
                </Table.Tbody>
            </Table>
        </ScrollArea>
    )
}

export default function NetworkDataDisplay({ currentState, id, authOptions }) {
    const { loading, error, data: machine } = useFetch(`/vm/${id}/networkdata`, authOptions);

    if (loading) return <Loading />;
    if (error) throw error;

    return (
        <Stack>
            <MachineTitle machine={machine} currentState={currentState} />
            <NetworkDataTable machine={machine} currentState={currentState} />
        </Stack>
    )
}
