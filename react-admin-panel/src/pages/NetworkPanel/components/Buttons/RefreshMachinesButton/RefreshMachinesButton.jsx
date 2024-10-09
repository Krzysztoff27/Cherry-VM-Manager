import { Button, Loader } from '@mantine/core'
import React from 'react'
import ConfirmationModal from '../../ConfirmationModal/ConfirmationModal'
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconRefresh, IconRefreshAlert } from '@tabler/icons-react';

export default function RefreshMachinesButton({isDirty, refreshMachines}) {
    const [opened, {open, close}] = useDisclosure();
    
    const Icon = isDirty ? IconRefreshAlert : IconRefresh;

    const onClick = () => isDirty ? open() : onConfirm();
    const onCancel = () => close();
    const onConfirm = () => {
        close();
        refreshMachines();
        notifications.show({
            id: `flow-reset`,
            color: 'yellow.7',
            title: 'Refreshing Network Configuration',
            message: `The machine data is currently being refreshed.`,
        });
    }
    
    return (
        <>
            <ConfirmationModal 
                opened={opened} 
                onCancel={onCancel}
                onConfirm={onConfirm}
                title='Confirm machines data refresh'
                message='By refreshing the machines you will discard all unsaved changes. Are you sure you want to continue?'
                confirmButtonProps={{color: 'red.7'}}
            />
            <Button
                onClick={onClick}
                variant='default'
                size='sm'
                pl='xs'
                pr='9'
            >
                <Icon size={20}/>
            </Button>
        </>
    )
}