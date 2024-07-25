import { Card, Group, Text, Badge, Button, Image, SimpleGrid, Stack, Progress, Flex, Grid, Title, ActionIcon } from "@mantine/core";
import { IconDeviceRemote, IconNumber, IconScreenShare, IconScreenShareOff } from "@tabler/icons-react";
import { Link } from "react-router-dom";

const concatanateObjectParametersFromTwoObjectsIntoArrayOfObjects = (a, b) =>
    Object.keys({ ...a, ...b })?.map(key => ({...a[key], ...b[key]}));

const firstLetterCapital = (str) => str.charAt(0).toUpperCase() + str.slice(1);

const DUMMY_ADDRESS_VAR = '10.0.0.1';

export default function VMPreviewPage({authFetch}) {
    const {loading: networkDataLoading, error: networkDataError, data: networkData} = authFetch('/vm/all/networkdata')
    const {loading: stateDataLoading, error: stateDataError, data: stateData} = authFetch('/vm/all/state')
    
    if(networkDataLoading || stateDataLoading) return;
    if(networkDataError || stateDataError) return;

    const virtualMachines = concatanateObjectParametersFromTwoObjectsIntoArrayOfObjects(networkData, stateData);
    let cards = {};

    for(const vm of virtualMachines){
        if(!cards[vm.group]) cards[vm.group] = [];
        const inGroupId = cards[vm.group].length + 1; 

        cards[vm.group].push((
            <Link to={`./${vm.id}`}>
                <Card shadow="sm" padding="md" radius="md" key={vm.id} withBorder w={275}>
                    <Card.Section>
                        <Image
                        src="https://linuxiac.b-cdn.net/wp-content/uploads/2021/03/opensuse.png"
                        height={75}
                        alt="Norway"
                        />
                    </Card.Section>

                    <Group justify="space-between" mt="md" mb="xs">
                        <Title order={4}>{firstLetterCapital(vm.group)} {inGroupId}</Title>
                        <Badge color={vm.active ? 'lime' : 'red'}>{vm.active ? 'On' : 'Off'}</Badge>
                    </Group>
                
                    <Stack gap='xs'>
                        <Group justify="start" gap='4px' align='center'>
                            <ActionIcon variant="subtle" aria-label="Połączenie zdalne" color='white' size='xs'>
                                {vm.active ? <IconScreenShare/> : <IconScreenShareOff/>}
                            </ActionIcon>
                            <Text>{vm.domain}</Text>
                        </Group>
                        <Group justify="start" gap='4px' align='center'>
                            <ActionIcon variant="subtle" aria-label="Połączenie zdalne" color='white' size='xs'>
                                {vm.active ? <IconNumber/> : <IconNumber/>}
                            </ActionIcon>
                            <Text>{DUMMY_ADDRESS_VAR}:{vm.port}</Text>
                        </Group>
                    </Stack>

                    <Button disabled={!vm.active} variant="light" fullWidth mt="md" radius="md">
                        Połącz się z maszyną
                    </Button>
                </Card>
            </Link>
        ))
    }


    return (
        <Stack>
            {Object.keys(cards).map((group, i) => (
                <Group key={i}>
                    {cards[group]}   
                </Group>
            ))}
        </Stack>
        
    )
}
