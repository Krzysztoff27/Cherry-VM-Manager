import { ActionIcon, Stack, Tooltip } from '@mantine/core';
import { IconDeviceDesktop, IconLogout, IconTerminal2, IconTopologyStar } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const categories = [
    {icon: IconTerminal2, label: 'Maszyny Wirtualne', link: '/virtual-machines'},
    {icon: IconDeviceDesktop, label: 'Komputery', link: '/desktops'},
    {icon: IconTopologyStar, label: 'Panel Sieci', link: '/network-panel'},
]

function IconButton({onClick, label = null, icon, active}) {
    return (
        <Tooltip 
            label={label} 
            hidden={!label} 
            position='right'
            color='#3b3b3b'
            offset={{mainAxis: 8}}
            transitionProps={{ transition: 'scale-x', duration: 200 }}

        >
            <ActionIcon
                variant={active ? 'filled' : 'default'}
                onClick={onClick}
                size='xl'
                aria-label={label}
            >
                {icon}
            </ActionIcon>
        </Tooltip>
    );
}

export default function NavBar({logout}) {
    const location = useLocation();
    const [active, setActive] = useState();
    
    useEffect(() => setActive(categories.findIndex(cat => cat.link === location.pathname)), 
        [location.pathname]);
    
    const navigate = useNavigate();
    const mainLinks = categories.map((category, i) => (
        <IconButton
            key={i}
            onClick={() => navigate(category.link)}
            active={active === i}
            label={category.label}
            icon={<category.icon stroke={1.5} />}
        />
    ))

    return (
        <Stack
            direction='column'
            p='lg'
            justify='space-between'
            align='center'
            h='100%'
            style={{backgroundColor: ""}}
        >
            <Stack gap='md'>
                {mainLinks}
            </Stack>
            <Stack>
                <IconButton onClick={logout} label='Wyloguj się' icon={<IconLogout  stroke={1.5} />}/>
            </Stack>
        </Stack>
    )
}
