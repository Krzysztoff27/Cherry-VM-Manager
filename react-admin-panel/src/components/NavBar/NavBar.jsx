import React from 'react'
import { Flex, NavLink, Tooltip, Space, Title, Avatar, Group, rem, Text, UnstyledButton } from '@mantine/core';
import { IconDeviceDesktop, IconTerminal2, IconTopologyStar, IconChevronRight, IconCherryFilled, IconLogout } from '@tabler/icons-react';
import { useLocation } from 'react-router-dom';

const categories = [
    {icon: IconTerminal2, label: 'Maszyny Wirtualne', link: '/virtual-machines'},
    {icon: IconDeviceDesktop, label: 'Komputery', link: '/desktops'},
    {icon: IconTopologyStar, label: 'Panel Sieci', link: '/network-panel'},
]


export default function NavBar({user, logout}) {
    let location = useLocation().pathname;
    const mainLinks = categories.map((category) => (
        <Tooltip
            label={category.label}
            position='right'
            withArrow
            transitionProps={{duration: 0}}
            key={category.label}
        >
            <NavLink
                onClick={() => location = category.link}
                active={location === category.link}
                href={category.link}
                label={category.label}
                h='50'
                variant="light"
                leftSection={<category.icon stroke={1.5}/>}
                rightSection={<IconChevronRight size="0.8rem" stroke={1.5} className="mantine-rotate-rtl" />}
            >
            </NavLink>
        </Tooltip>
    ))

    return (
        <Flex
            direction='column'
            justify='space-between'
            h='100%'
        >
            <Flex
                direction='column'
            >
                <Flex align='center' gap='sm'>
                    <IconCherryFilled style={{width: rem(44), height: rem(44)}}/>
                    <Title order={3}>Wiśniowy Panel Kontrolny</Title>
                </Flex>
                <Space h='sm'/>
                <Flex direction='column'>
                    {mainLinks}

                </Flex>
            </Flex>
            <Group>
                <Avatar
                    src="/icons/tux.png"
                    radius="sm"
                />
                <div style={{ flex: 1 }}>
                <Text size="sm" fw={500}>
                    {user?.username ?? ''}
                </Text>

                <Text c="dimmed" size="xs">
                    {'local@' + user?.username ?? ''}
                </Text>
                </div>

                <UnstyledButton
                    onClick={logout}
                >
                    <IconLogout style={{ width: rem(20), height: rem(20) }} stroke={1.5} />
                </UnstyledButton>
            </Group>
        </Flex>
    )
}
