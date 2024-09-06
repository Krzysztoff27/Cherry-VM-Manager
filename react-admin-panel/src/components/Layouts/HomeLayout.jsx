import { AppShell, Group, rem, SimpleGrid, Text } from '@mantine/core'
import React from 'react'
import { Link, Outlet } from 'react-router-dom'

export default function HomeLayout() {
    return (
        <AppShell>
            <AppShell.Main w={'100%'}>
                <Outlet/>
            </AppShell.Main>
            <AppShell.Footer p='sm'>
                <Group w='100%' justify='center'>
                    <SimpleGrid w={rem(900)} cols={4} ta='center' c='dimmed'>
                        <Text component={Link} to='/'>Home</Text>
                        <Text component={Link}>Documentation</Text>
                        <Text component={Link} to='/credits'>Credits</Text>
                        <Text component={Link} to='/copyright'>Copyright</Text>
                    </SimpleGrid>
                </Group>
            </AppShell.Footer>
        </AppShell>
    )
}
