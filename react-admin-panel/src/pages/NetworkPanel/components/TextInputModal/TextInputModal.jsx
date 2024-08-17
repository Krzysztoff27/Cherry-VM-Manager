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
                if(!value || value?.length < 3) return 'Nazwa migawki musi mieć przynajmniej 3 znaki.'
                if(value.length > 16) return 'Nazwa migawki nie może mieć więcej niż 16 znaków.'
                if(!(/^[a-zA-Z0-9][\w-]*$/.test(value))) return 'Nazwa migawki może składać się jedynie z liter, cyfr, myślników i znaków podkreślenia oraz musi zaczynać się literą lub cyfrą.'
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
                        Potwierdź
                    </Button>
                </Stack>
            </form>
        </Modal>
    )
}
