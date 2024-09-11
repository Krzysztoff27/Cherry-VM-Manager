import { Avatar, Button, Center, Divider, Fieldset, Group, PasswordInput, Space, Text, TextInput } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import React from 'react';
import useAuth from '../../hooks/useAuth';
import useApi from '../../hooks/useApi';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
    const navigate = useNavigate();
    const {post} = useApi();
    const {setToken} = useAuth();
    const form = useForm({
        mode: 'uncontrolled',
        validate: {
            username: isNotEmpty(),
            password: isNotEmpty(),
        }
    })

    /**
     * @typedef {object} TokenRequestForm
     * @property {string} username
     * @property {string} password
     * 
     * Sends a POST request for the token with filled form data
     * @param {TokenRequestForm} values 
     */
    async function authenticate(values) {
        const jsonResponse = await post('/token', new URLSearchParams({
            username: values.username,
            password: values.password,
        }));

        if(!jsonResponse?.access_token) return;

        setToken(jsonResponse.access_token)
        notifications.clean();
    }

    return (
        <Center h={'100vh'}>
            <Fieldset w='400'>
                <form onSubmit={form.onSubmit(authenticate)}>
                    <Group align='flex-end' pt='xs'>
                        <Avatar src='/icons/Cherry Admin Panel.webp' radius={0}/>
                        <Text size="xl" fw={500}>
                            Cherry Admin Panel
                        </Text>
                    </Group>
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
                    <Group justify="space-between" mt="md">
                        <Button 
                            onClick={() => navigate('/')} 
                            style={{fontWeight: 500}}
                            color='dark.1'
                            variant='light'
                        >
                            Go back
                        </Button>
                        <Button type="submit">Sign in</Button>
                    </Group>
                </form>
            </Fieldset>
        </Center>
    )
}
