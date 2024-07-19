import React, { useState } from 'react'
import { Flex, NavLink, Tooltip, Space, Title, Avatar, Group, rem, Text, UnstyledButton, Container, InputWrapper, ScrollArea } from '@mantine/core';
import { IconDeviceDesktop, IconTerminal2, IconTopologyStar, IconChevronRight, IconCherryFilled, IconLogout, IconX } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import useFetch from '../../hooks/useFetch.jsx';
import { notifications } from '@mantine/notifications';

const categories = {
    vm: {icon: IconTerminal2, label: 'Maszyny Wirtualne', link: '/virtual-machines', subLinks: []},
    pc: {icon: IconDeviceDesktop, label: 'Komputery', link: '/desktops', subLinks: []},
    networkPanel: {icon: IconTopologyStar, label: 'Panel Sieci', link: '/network-panel'},
}

const showError = (message, id) => {
    if(id) notifications.hide(id);

    notifications.show({
        id: id ?? 'default-id',
        withCloseButton: true,
        autoClose: 2000,
        title: 'Wystąpił błąd',
        message: message,
        color: 'red',
        icon: <IconX/>,
        loading: false,
    });
};

export default function NavBar({user, logout, API_URL, AUTH_OPTIONS}) {
    const [active, setActive] = useState(0)
    const [opened, setOpened] = useState(null)
    const navigate = useNavigate();

    const {error: VMError, data: VMData} = useFetch(API_URL + '/vm', AUTH_OPTIONS);

    if(VMError) showError('Nie udało się pobrać danych o maszynach wirtualnych', 'vm');
    if(VMData) {
        categories.vm.subLinks = Object.values(VMData).map((vm, i) => (
            <NavLink
                label={vm.type + ' ' + vm.number}
                key={i}
                onClick={() => navigate(categories.vm.link + '/' + vm.id)}
            /> 
        ))
    }

    const mainLinks = Object.values(categories).map((category, i) => (
        <NavLink
            key={i}
            onClick={() => {
                setActive(i)
                setOpened(opened === i ? null : i);
                navigate(category.link);
            }}
            active={active === i}
            opened={category.subLinks && opened === i}
            label={category.label}
            
            h='50'
            variant="light"
            leftSection={<category.icon stroke={1.5}/>}
            rightSection={<IconChevronRight size="0.8rem" stroke={1.5} className="mantine-rotate-rtl" />}
        >
            {category.subLinks}
        </NavLink>    
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
            <Group p='sm'>
                <Avatar src="/icons/tux.png" radius="sm"/>
                <div style={{ flex: 1 }}>
                    <Text size="sm" fw={500}>{user?.username ?? ''}</Text>
                    <Text c="dimmed" size="xs">{'local@' + user?.username ?? ''}</Text>
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
