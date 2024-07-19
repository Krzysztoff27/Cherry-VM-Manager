import { Button, Center, Container, Divider, Fieldset, Group, PasswordInput, Space, Text, TextInput } from '@mantine/core';
import { useForm, isNotEmpty} from '@mantine/form';
import React from 'react'
import { IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export default function LoginPage({setToken, API_URL}) {
    const form = useForm({
        mode: 'uncontrolled',
        validate: {
            username: isNotEmpty(),
            password: isNotEmpty(),
        }
    })
    
    const showError = (message) => notifications.show({
        withCloseButton: true,
        autoClose: 10000,
        title: 'Wystąpił błąd podczas logowania',
        message: message,
        color: 'red',
        icon: <IconX />,
        className: 'my-notification-class',
        loading: false,
    });

    function authenticate(values) {
        if(!API_URL) {
            showError('Nie udało połączyć się z serwerem uwierzytelniającym.');
            throw new Error('API URL not set')
        }

        fetch(API_URL + '/token', {
            method: 'POST', 
            headers: {'accept': 'application/json'},
            body: new URLSearchParams({
                username: values.username, 
                password: values.password,
            })
        })
        .then(response => {
            if(!response.ok) return showError('Niepoprawny login lub hasło.')
            notifications.clean();
            return response.json();
        })
        .then(json => setToken(json.access_token))
        .catch(err => showError())
    }

    return (
        <Center h={'100vh'}>
            <Fieldset w='400'>
                <form onSubmit={form.onSubmit(authenticate)}>
                    <Text size="xl" fw={500}>
                        Wiśniowy Panel Kontrolny
                    </Text>
                    <Space h="sm"/>
                    <Divider label="Zaloguj się dopuszczonym kontem serwerowym"/>
                    <Space h="sm"/>
                    <TextInput
                        label="Nazwa użytkownika"
                        description=" "
                        placeholder="Wpisz login"
                        withAsterisk
                        key={form.key('username')}
                        {...form.getInputProps('username')}
                    />
                    <Space h="sm"/>
                    <PasswordInput
                        label="Hasło"
                        description=" "
                        placeholder="Wpisz hasło"
                        withAsterisk
                        key={form.key('password')}
                        {...form.getInputProps('password')}
                    />
                    <Group justify="flex-end" mt="md">
                        <Button type="submit">Zaloguj się</Button>
                    </Group>
                </form>
            </Fieldset>
        </Center>
    )
}
