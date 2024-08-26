import { Button, Modal, Stack, TextInput } from '@mantine/core'
import { useRef } from 'react'
import { useForm } from '@mantine/form'

export default function TextInputModal({modalProps, opened, title, content = '', textInputProps, onCancel, onConfirm}) {
    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            input: '',
        },
        validate: {
            input: (value) => {
                if(!value || value?.length < 3) return 'Snapshot name must be at least 3 characters long.'
                if(value.length > 16) return 'Snapshot name must not be longer than 16 characters.'
                if(!(/^[a-zA-Z0-9][\w\-\ ]*$/.test(value))) return 'Snapshot name can only contain alphanumeric characters, spaces, hyphens and underlines and must start with the alphanumeric character.'
            }
        }
    })

    return (
        <Modal
            opened={opened}
            onClose={onCancel}
            title={title}
            {...modalProps}
        >
            <form onSubmit={form.onSubmit(values => {
                onConfirm(values.input);
                form.setValues({input: ''})
            })}>
                <Stack>
                    {content}
                    <TextInput 
                        {...textInputProps}
                        {...form.getInputProps('input')}
                    />
                    <Button
                        type='submit'
                        variant='light'
                        radius='sm' 
                        data-autofocus
                    >
                        Confirm
                    </Button>
                </Stack>
            </form>
        </Modal>
    )
}
