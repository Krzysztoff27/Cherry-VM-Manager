import { Button, Card, Group, Image, Stack, Text, Title } from "@mantine/core";
import { IconHomeLink, IconHomeX, IconScreenShare, IconScreenShareOff } from "@tabler/icons-react";
import StateBadge from "../../../../components/StateBadge/StateBadge";

export default function MachineCard({machine, to, navigate}){
    if(!machine) return;

    const handleCardClick = () => navigate(to);
    
    const handleBadgeClick = (event) => {
        event.stopPropagation(); // Prevents the card click event
        // ...
        // TODO: replace with logic
        // ...
        console.log('VM ' + machine.id + ': Badge clicked.')
    };
    
    const handleButtonClick = (event) => {
        event.stopPropagation(); // Prevents the card click event
        if (machine.active) window.open(`http://${machine.domain}`, '_blank');
    };

    return (
        <Card shadow="sm" padding="md" radius="md" withBorder onClick={handleCardClick} style={{cursor: 'pointer'}}>
            <Card.Section>
                <Image
                    src="/icons/Geeko White.webp"
                    height={55}
                    alt="geeko"
                    style={{
                        objectPosition: '0 0',
                        filter: 'brightness(0) saturate(100%) invert(24%) sepia(0%) saturate(0%) hue-rotate(225deg) brightness(93%) contrast(87%)'
                    }}
                    lightHidden
                />
            </Card.Section>

            <Group justify="space-between" mt="md" mb="xs">
                <Title order={4} tt="capitalize">{machine.group} {machine.group_member_id}</Title>
                <StateBadge machineState={machine} onClick={handleBadgeClick}/>
            </Group>
            <Stack gap='xs'>
                <Group justify="start" gap='4px' align='center'>
                    {machine.active ? 
                        <IconScreenShare    size={18}/> : 
                        <IconScreenShareOff size={18}/>
                    }
                    <Text>{machine.domain}</Text>
                </Group>
                <Group justify="start" gap='4px' align='center'>
                    {machine.active ? 
                        <IconHomeLink size={18}/> : 
                        <IconHomeX    size={18}/>
                    }
                    <Text>172.168.100.1:{machine.port}</Text>
                </Group>
            </Stack>
            
            <Button 
                onClick={handleButtonClick}
                disabled={!machine.active}

                variant="light" 
                mt="md" 
                radius="md" 
            >
                Connect to this machine
            </Button>
        </Card>
        
    );
}