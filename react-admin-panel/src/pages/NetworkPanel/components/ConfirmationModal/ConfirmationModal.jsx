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
                    {message ?? 'Performing this action will discard all current changes. Are you sure you want to continue?'}
                </Text>
                <SimpleGrid cols={2} grow='true'>
                    <Button onClick={onCancel} variant='light' color='gray' radius='sm' data-autofocus {...cancelButtonProps}>Cancel</Button>
                    <Button onClick={onConfirm} variant='light' color="gray" radius='sm' {...confirmButtonProps}>Confirm</Button>
                </SimpleGrid>
            </Stack>
        </Modal>
    )
}
