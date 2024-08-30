import { AppShell, Avatar, Button, Card, Group, Image, List, rem, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';

const panels = [
    {
        title: 'Apache Guacamole Panel',
        description: 'Apache Guacamole is a free and open-source, cross-platform, clientless remote desktop gateway maintained by the Apache Software Foundation.',
        color: '#578c34',
        icon: {
            src: '/icons/apache_guacamole.webp',
            alt: 'Apache Guacamole Logo',
        },
    },
    {
        title: 'Traefik Proxy Panel',
        description: 'Traefik is the leading open-source reverse proxy and load balancer for HTTP and TCP-based applications.',
        color: '#24A0C1',
        icon: {
            src: '/icons/traefik_proxy.webp',
            alt: 'Traefik Proxy Logo',
        },
    },

]

export default function Home() {

    const cards = panels.map((panel, i) => (
        <Card key={i} shadow='sm' padding='lg' radius='md' ta='left' withBorder>
            <Stack justify='space-between' gap='md' h='100%'>
                <Stack gap='xs'>
                    <Group justify='start' gap='sm'>
                        <Avatar src={panel.icon.src} title={panel.icon.alt} alt={panel.icon.alt} />
                        <Text size='xl' fw={500}>{panel.title}</Text>
                    </Group>
                    <Text size='sm' c='dimmed'>{panel.description}</Text>
                </Stack>
                <Button color={panel.color} radius='md' fullWidth>Log in</Button>
            </Stack>
        </Card>
    ))

    return (
        <AppShell>
        <Stack pt={rem(64)} align='center' gap={rem(48)} ta='center'>
            <Stack align='center'>
                <Title>Welcome to the Cherry Admin Panel!</Title>
                <Text size='lg' ta='center'>This web application is the management center for your Cherry VM Manager.<br/> Its purpose is to provide user-friendly experience in controling deployed machines.</Text>

            </Stack>

            <Card w={800} shadow='sm' padding='lg' radius='md' ta='left' withBorder>
                <Group>
                    <Image
                        src='/icons/cherry_admin_panel.webp'
                        fit="contain"
                        mah={200}
                        flex={1}
                    />
                    <Stack gap='0'>
                        <Text>Here you can:</Text>
                        <List mt={rem(4)}>
                            <List.Item>Monitor your Virtual Machines and their activity.</List.Item>
                            <List.Item>Manage their state remotely.</List.Item>
                            <List.Item>Configure network connections between your machines.</List.Item>
                            <List.Item><Text c='dimmed'>... and more</Text></List.Item>
                        </List>
                        <Button component={Link} to='/login' color='cherry.10' radius='md' mt='md' fullWidth>
                            Enter the panel
                        </Button>
                    </Stack>
                </Group>

                
            </Card>
            <Text size='lg'>For advanced configurations, you might want to enter the dependancy panels:</Text>
            <SimpleGrid cols={2} w={800}>
                {...cards}
            </SimpleGrid>
        </Stack>
            <AppShell.Footer p='sm'>
                <Group w='100%' justify='center'>
                    <SimpleGrid w={750} cols={3} gap={rem(96)} ta='center' c='dimmed'>
                        <Text component={Link}>Documentation</Text>
                        <Text component={Link} to='/credits'>Credits</Text>
                        <Text component={Link} to='/copyright'>Copyright</Text>
                    </SimpleGrid>
                </Group>
            </AppShell.Footer>
        </AppShell>
    )
}
