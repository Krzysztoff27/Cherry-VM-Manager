import { List } from '@mantine/core';
import { Outlet } from 'react-router-dom';

const envData = [
    {
        path: 'VITE_API_BASE_URL',
        regex: /^https?:\/\/[\w+.,]*(:\d{2,5})?$/
    },
]

export default function ConfigValidator() {
    const getEnv = (path) => import.meta.env[path];

    const invalid = envData.filter(env => !(env.regex).test(`${getEnv(env.path)}`))

    if (!invalid.length) return <Outlet/>;

    const getErrLine = (envPath) => `Environmental variable "${envPath}" is either not set or its value is invalid.`;
    const errorMessage = (
        <List ta={invalid.length === 1 ? 'center' : 'left'}>
            {...invalid.map((env, i) => <List.Item key={i}>{getErrLine(env.path)}</List.Item>)}
        </List>
    );

    throw new Object({ status: 601, message: errorMessage });
}