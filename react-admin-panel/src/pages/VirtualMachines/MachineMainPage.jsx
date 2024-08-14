import { Badge, Button, Card, Collapse, Group, Image, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useElementSize, useLocalStorage } from "@mantine/hooks";
import { IconChevronDown, IconChevronRight, IconHomeLink, IconHomeX, IconPlayerPlayFilled, IconPlayerStopFilled, IconScreenShare, IconScreenShareOff } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { showError } from "../../handlers/notifications";
import StateBadge from "../../components/StateBadge/StateBadge";

const mergeObjectPropertiesToArray = (a, b) =>
    Object.keys({ ...a, ...b })?.map(key => ({...a[key], ...b[key]}));

function VMCard({vm, to, navigate}){
    if(!vm) return;

    const handleCardClick = () => navigate(to);
    
    const handleBadgeClick = (event) => {
        event.stopPropagation(); // Prevents the card click event
        // ...
        // ... to be replaced with logic
        // ...
        console.log('VM ' + vm.id + ': Badge clicked.')
    };
    
    const handleButtonClick = (event) => {
        event.stopPropagation(); // Prevents the card click event
        if (vm.active) window.open(`http://${vm.domain}`, '_blank');
    };

    return (
        <Card shadow="sm" padding="md" radius="md" withBorder onClick={handleCardClick} style={{cursor: 'pointer'}}>
            <Card.Section>
                <Image
                    src="/icons/white_geeko.webp"
                    height={55}
                    alt="geeko"
                    style={{
                        objectPosition: '0 0',
                        filter: 'brightness(0) saturate(100%) invert(24%) sepia(0%) saturate(0%) hue-rotate(225deg) brightness(93%) contrast(87%)'
                    }}
                    lightHidden
                />
                <Image
                    src="/icons/white_geeko.webp"
                    height={55}
                    alt="geeko"
                    style={{
                        objectPosition: '0 0',
                        filter: 'brightness(0.875)'
                    }}
                    darkHidden
                />
            </Card.Section>

            <Group justify="space-between" mt="md" mb="xs">
                <Title order={4} tt="capitalize">{vm.group} {vm.group_member_id}</Title>
                <StateBadge machineState={vm} onClick={handleBadgeClick}/>
            </Group>
            <Stack gap='xs'>
                <Group justify="start" gap='4px' align='center'>
                    {vm.active ? 
                        <IconScreenShare    size={18}/> : 
                        <IconScreenShareOff size={18}/>
                    }
                    <Text>{vm.domain}</Text>
                </Group>
                <Group justify="start" gap='4px' align='center'>
                    {vm.active ? 
                        <IconHomeLink size={18}/> : 
                        <IconHomeX    size={18}/>
                    }
                    <Text>172.168.100.1:{vm.port}</Text>
                </Group>
            </Stack>
            
            <Button 
                onClick={handleButtonClick}
                disabled={!vm.active}

                variant="light" 
                mt="md" 
                radius="md" 
            >
                Połącz się z tą maszyną
            </Button>
        </Card>
        
    );
}

function CardGroup({children, group}){
    const {ref, width} = useElementSize();
    const [opened, setOpened] = useLocalStorage({key: `${group}-opened`, defaultValue: false});
    const toggle = () => setOpened((o) => !o);

    return (
        <Stack ref={ref}>
            <Button 
                onClick={toggle} 
                aria-label={`${opened ? 'Zwiń' : 'Rozwiń'} grupę maszyn wirtualnych.`}
                variant='default' 
                fullWidth
                justify='left'
                leftSection={
                    opened ?
                    <IconChevronDown size={16} stroke={1.5}/> :
                    <IconChevronRight size={16} stroke={1.5}/>
                }
            >
                <Text tt="capitalize">{group}</Text>
            </Button>

            <Collapse in={opened}>
                <SimpleGrid cols={Math.floor(width / 300)}>
                    {children}   
                </SimpleGrid>
            </Collapse>
        </Stack>
    )
}

export default function MachineMainPage({authFetch}) {
    const navigate = useNavigate();
    const {loading: networkDataLoading, error: networkDataError, data: networkData} = authFetch('/vm/all/networkdata')
    const {loading: stateDataLoading, error: stateDataError, data: stateData} = authFetch('/vm/all/state')

    const handleError = (err) => {
        if(err?.status == 401) return navigate('/login');
        showError({title: `Wystąpił bład ${err?.status ?? ''}`, message: 'Nie udało się pobrać informacji o maszynach', autoclose: 1000})
    }

    if(networkDataLoading || stateDataLoading) return;
    if(networkDataError || stateDataError) {
        handleError(networkDataError || stateDataError);
        return;
    }

    const virtualMachines = mergeObjectPropertiesToArray(networkData, stateData);
    let cards = {};

    for(const vm of virtualMachines){
        if(!cards[vm.group]) cards[vm.group] = [];

        cards[vm.group].push(<VMCard vm={vm} to={`./${vm.id}`} navigate={navigate} key={vm.id}/>)
    }

    return (
        <Stack>
            {Object.keys(cards).map((group, i) => (
                <CardGroup key={i} group={group}>
                    {cards[group]}
                </CardGroup>
            ))}
        </Stack>        
    )
}
