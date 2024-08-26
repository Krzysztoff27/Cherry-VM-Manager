import { ActionIcon, Stack, Tooltip } from '@mantine/core';
import { IconDeviceDesktop, IconHome, IconLogout, IconTerminal2, IconTopologyStar } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const categories = [
    {icon: IconHome, label: 'Home page', link: '/'},
    {icon: IconTerminal2, label: 'Virtual Machines', link: '/virtual-machines'},
    {icon: IconDeviceDesktop, label: 'Desktops', link: '/desktops'},
    {icon: IconTopologyStar, label: 'Network Panel', link: '/network-panel'},
]

function IconButton({label = null, icon, active, ...props}) {
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
                {...props}
                variant={active ? 'filled' : 'default'}
                size='xl'
                aria-label={label}
            >
                {icon}
            </ActionIcon>
        </Tooltip>
    );
}

export default function NavBar({}) {
    const {logout, setToken} = useAuth();
    const location = useLocation();
    const [active, setActive] = useState();
    
    useEffect(() => setActive(categories.findIndex(cat => cat.link === location.pathname)), 
        [location.pathname]);

    const mainLinks = categories.map((category, i) => (
        <IconButton
            key={i}
            component={Link}
            to={category.link}
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
                <IconButton onClick={logout} label='Log out' icon={<IconLogout  stroke={1.5} />}/>
            </Stack>
        </Stack>
    )
}
