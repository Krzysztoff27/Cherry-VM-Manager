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
            title: 'Przywrócono konfigurację sieciową',
            message: `Pomyślnie przywrócono obecny stan konfiguracji sieciowej maszyn.`
        }))
    }
    
    return (
        <>
            <ConfirmationModal 
                opened={opened} 
                onCancel={onCancel}
                onConfirm={onConfirm}
                title='Potwierdzenie operacji'
                message='Wykonanie tej operacji odrzuci wszystkie dotychczasowe zmiany i przywróci obecnie działającą konfigurację. Czy napewno chcesz kontynuować?'
                confirmButtonProps={{color: 'red.7'}}
            />
            <Button
                onClick={onClick}
                display={!isDirty ? 'none' : undefined}
                disabled={!isDirty}
                variant='default'
                w={100}
            >
                Odrzuć
            </Button>
        </>
    )
}
