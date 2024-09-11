import { List } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import envData from '../../assets/data/envValidation';

/**
 * A root route component responsible for validating environmental variables.
 * If any environmental variable doesn't match the specified regex, it throws an error with a status of 601 and a detailed message.
 * @throws {Object} Throws an object containing the following properties:
 * - {number} status - HTTP-like error status (601: environmental variable error).
 * - {JSX.Element} message - Mantine List component containing messages for each invalid configuration.
 * @returns {JSX.Element} The <Outlet/> component if all environment variables are valid.
 */
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