import { Button, Modal, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import React from 'react'

export default function ConfirmationModal({modalProps, opened, message, title, cancelButtonProps, confirmButtonProps, onCancel, onConfirm}) {
    return (
        <Modal
            opened={opened}
            onClose={onCancel}
            withCloseButton={false}
            {...modalProps}
        >
            <Stack>
                <Title order={4}>{title}</Title>
                <Text size='sm'>
                    {message ?? 'Wykonanie tej operacji odrzuci wszystkie dotychczasowe zmiany. Czy napewno chcesz kontynuować?'}
                </Text>
                <SimpleGrid cols={2} grow='true'>
                    <Button onClick={onCancel} variant='light' color='gray' radius='sm' data-autofocus {...cancelButtonProps}>Powróć</Button>
                    <Button onClick={onConfirm} variant='light' color="gray" radius='sm' {...confirmButtonProps}>Potwierdź</Button>
                </SimpleGrid>
            </Stack>
        </Modal>
    )
}
