import { Button, Center, Divider, Fieldset, Group, PasswordInput, Space, Text, TextInput } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import React from 'react';
import useAuth from '../../hooks/useAuth';
import useApi from '../../hooks/useApi';

export default function LoginPage() {
    const {post} = useApi();
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
        }));

        if(!jsonResponse?.access_token) return;

        auth.setToken(jsonResponse.access_token)
        notifications.clean();
    }

    return (
        <Center h={'100vh'}>
            <Fieldset w='400'>
                <form onSubmit={form.onSubmit(authenticate)}>
                    <Text size="xl" fw={500}>
                        Cherry Admin Panel
                    </Text>
                    <Space h="sm" />
                    <Divider label="Log in with an authorized server account" />
                    <Space h="sm" />
                    <TextInput
                        label="Username"
                        description=" "
                        placeholder="Enter your username"
                        withAsterisk
                        key={form.key('username')}
                        {...form.getInputProps('username')}
                    />
                    <Space h="sm" />
                    <PasswordInput
                        label="Password"
                        description=" "
                        placeholder="Enter your password"
                        withAsterisk
                        key={form.key('password')}
                        {...form.getInputProps('password')}
                    />
                    <Group justify="flex-end" mt="md">
                        <Button type="submit">Sign in</Button>
                    </Group>
                </form>
            </Fieldset>
        </Center>
    )
}
