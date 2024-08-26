import { Button } from '@mantine/core'
import React from 'react'
import ConfirmationModal from '../../ConfirmationModal/ConfirmationModal'
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';

export default function RestoreButton({resetFlow = () => {}, isDirty}) {
    const [opened, {open, close}] = useDisclosure();
    
    const onClick = () => open();
    const onCancel = () => close();
    const onConfirm = () => {
        close();
        resetFlow()
        .then(() => notifications.show({
            id: 'flow-reset',
            color: 'suse-green',
            title: 'Network configuration restored',
            message: `The network configuration was successfuly restored.`
        }))
    }
    
    return (
        <>
            <ConfirmationModal 
                opened={opened} 
                onCancel={onCancel}
                onConfirm={onConfirm}
                title='Confirm restoration'
                message='Performing this action will discard all current changes and revert to the currently active configuration. Are you sure you want to continue?'
                confirmButtonProps={{color: 'red.7'}}
            />
            <Button
                onClick={onClick}
                display={!isDirty ? 'none' : undefined}
                disabled={!isDirty}
                variant='default'
                w={100}
            >
                Discard
            </Button>
        </>
    )
}
