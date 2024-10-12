import { Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconHomeLink, IconHomeX, IconScreenShare, IconScreenShareOff } from "@tabler/icons-react";
import ActivitySparkline from "../ActivitySparkline/ActivitySparkline";
import { useNavigate } from "react-router-dom";
import classes from './MachineCard.module.css';

/**
 * Renders a card component representing a virtual machine with its relevant information and controls.
 * The card includes an activity sparkline, machine group and ID, domain and port information, and
 * a "Connect" button that opens the machine's domain in a new tab if the machine is active.
 * 
 * @param {Object} props - The properties passed to the component.
 * @param {Object} props.machine - The machine object containing the machine's details.
 * @param {string} props.machine.group - The group the machine belongs to (e.g., 'Development', 'Production').
 * @param {number} props.machine.group_member_id - A unique identifier for the machine within its group.
 * @param {string} props.machine.domain - The machine's domain, used for connecting.
 * @param {number} props.machine.port - The port used by the machine for access.
 * @param {boolean} props.machine.active - Flag indicating whether the machine is active and connectable.
 * @param {string} props.to - The navigation path where clicking the card should redirect the user.
 * @param {Object} props.currentState - The current state of the machine, used for showing activity and connectivity status.
 * @param {boolean} props.currentState.active - Whether the machine is currently active (e.g., online or available).
 *
 * @returns {JSX.Element} - The rendered card component for the machine.
 */
export default function MachineCard({ machine, to, currentState }) {
    const navigate = useNavigate();

    const handleCardClick = () => navigate(to)

    const handleButtonClick = (event) => {
        event.stopPropagation(); // Prevents the card click event
        if (machine.active) window.open(`http://${machine.domain}`, '_blank');
    };

    return (
        <Card shadow="sm" onClick={handleCardClick} className={classes.card}>
            <Card.Section>
                <ActivitySparkline currentState={currentState} />
            </Card.Section>

            <Group className={classes.titleGroup}>
                <Title order={4} tt="capitalize">{machine.group} {machine.group_member_id}</Title>
            </Group>
            <Stack gap='xs'>
                <Group className={classes.infoEntry}>
                    {currentState?.active ?
                        <IconScreenShare size={18} /> :
                        <IconScreenShareOff size={18} />
                    }
                    <Text>{machine.domain}</Text>
                </Group>
                <Group className={classes.infoEntry}>
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
                className={classes.connectButton}
            >
                Connect to this machine
            </Button>
        </Card>
    );
}

