import { Avatar, Container, Flex, Group, NavLink, rem, ScrollArea, Space, Text, Title, Tooltip, UnstyledButton, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import { IconCherryFilled, IconChevronRight, IconDeviceDesktop, IconLogout, IconMoon, IconSun, IconTerminal2, IconTopologyStar } from '@tabler/icons-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const categories = {
    vm: {icon: IconTerminal2, label: 'Maszyny Wirtualne', link: '/virtual-machines'},
    pc: {icon: IconDeviceDesktop, label: 'Komputery', link: '/desktops'},
    networkPanel: {icon: IconTopologyStar, label: 'Panel Sieci', link: '/network-panel'},
}

function IconButton({onClick, label = null, children}) {
    return (
        <Tooltip label={label} hidden={!label}>
            <UnstyledButton
                onClick={onClick}
                size="xl"
                aria-label={label}
            >
                {children}
            </UnstyledButton>
        </Tooltip>
    );
}

function User({user, logout}){
    const { setColorScheme } = useMantineColorScheme();
    const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
    const toggleColorScheme = () => setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light')

    return (
        <Group p='sm' pr='lg'>
            <Avatar src="/icons/tux.png" radius="sm"/>
            <div style={{ flex: 1 }}>
                <Text size="sm" fw={500}>{user?.username ?? ''}</Text>
                <Text c="dimmed" size="xs">{'local@' + (user?.username ?? '')}</Text>
            </div>

            <IconButton onClick={toggleColorScheme} label='Zmień motyw koloru'>
                <Container lightHidden>
                    <IconSun stroke={1.5}/>
                </Container>
                <Container darkHidden>
                    <IconMoon stroke={1.5}/>
                </Container>
            </IconButton>
            <IconButton onClick={logout} label='Wyloguj się'>
                <IconLogout  stroke={1.5} />
            </IconButton>
        </Group>
    );
}

export default function NavBar({user, logout}) {
    const [active, setActive] = useState(0)
    
    const navigate = useNavigate();
    const mainLinks = Object.values(categories).map((category, i) => (
        <NavLink
            key={i}
            onClick={() => {
                setActive(i)
                navigate(category.link);
            }}
            active={active === i}
            label={category.label}
            
            h='50'
            variant="light"
            leftSection={<category.icon stroke={1.5}/>}
            rightSection={<IconChevronRight size="0.8rem" stroke={1.5} className="mantine-rotate-rtl" />}
        />
    ))

    return (
        <Flex
            direction='column'
            justify='space-between'
            h='100%'
        >
            <ScrollArea p='sm'>
                <Flex align='center' gap='sm'>
                    <IconCherryFilled style={{width: rem(44), height: rem(44)}}/>
                    <Title order={3}>Wiśniowy Panel Kontrolny</Title>
                </Flex>
                <Space h='sm'/>
                <Flex direction='column'>
                    {mainLinks}
                </Flex>
            </ScrollArea>
            <User user={user} logout={logout}/>
        </Flex>
    )
}
