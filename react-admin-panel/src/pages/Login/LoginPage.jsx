import { Button, Center, Divider, Fieldset, Group, PasswordInput, Space, Text, TextInput } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import React from 'react';
import { post } from '../../api/requests';
import useAuth from '../../hooks/useAuth';

export default function LoginPage({ errorHandler }) {
    const auth = useAuth();
    const form = useForm({
        mode: 'uncontrolled',
        validate: {
            username: isNotEmpty(),
            password: isNotEmpty(),
        }
    })

    async function authenticate(values) {
        const jsonResponse = await post('/token', new URLSearchParams({
            username: values.username,
            password: values.password,
        }), undefined, errorHandler);

        if(!jsonResponse?.access_token) return;

        auth.setToken(jsonResponse.access_token)
        notifications.clean();
    }

    return (
        <Center h={'100vh'}>
            <Fieldset w='400'>
                <form onSubmit={form.onSubmit(authenticate)}>
                    <Text size="xl" fw={500}>
                        Wiśniowy Panel Kontrolny
                    </Text>
                    <Space h="sm" />
                    <Divider label="Zaloguj się dopuszczonym kontem serwerowym" />
                    <Space h="sm" />
                    <TextInput
                        label="Nazwa użytkownika"
                        description=" "
                        placeholder="Wpisz login"
                        withAsterisk
                        key={form.key('username')}
                        {...form.getInputProps('username')}
                    />
                    <Space h="sm" />
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
