import { Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconHomeLink, IconHomeX, IconScreenShare, IconScreenShareOff } from "@tabler/icons-react";
import ActivitySparkline from "../ActivitySparkline/ActivitySparkline";

const maxKeepTime = 6;

export default function MachineCard({ machine, to, navigate, currentState }) {

    const handleCardClick = () => navigate(to)

    const handleButtonClick = (event) => {
        event.stopPropagation(); // Prevents the card click event
        if (machine.active) window.open(`http://${machine.domain}`, '_blank');
    };

    return (
        <Card shadow="sm" padding="md" radius="md" onClick={handleCardClick} style={{ cursor: 'pointer' }} h={240}>
            <Card.Section>
                <ActivitySparkline currentState={currentState} />
            </Card.Section>

            <Group justify="space-between" mb="xs" mt='4'>
                <Title order={4} tt="capitalize">{machine.group} {machine.group_member_id}</Title>
            </Group>
            <Stack gap='xs'>
                <Group justify="start" gap='4px' align='center'>
                    {currentState?.active ?
                        <IconScreenShare size={18} /> :
                        <IconScreenShareOff size={18} />
                    }
                    <Text>{machine.domain}</Text>
                </Group>
                <Group justify="start" gap='4px' align='center'>
                    {currentState?.active ?
                        <IconHomeLink size={18} /> :
                        <IconHomeX size={18} />
                    }
                    <Text>172.168.100.1:{machine.port}</Text>
                </Group>
            </Stack>

            <Button
                onClick={handleButtonClick}
                disabled={!currentState?.active}
                color='dark.1'
                variant="light"
                mt="md"
                radius="md"
            >
                Connect to this machine
            </Button>
        </Card>
    );
}

