import { Button, Center, Space } from "@mantine/core";
import { useNavigate, useRouteError } from "react-router-dom"
import styles from './ErrorBoundary.module.css';
import errors from '../../assets/data/reactErrors.json';


export default function ErrorBoundary() {
    const navigate = useNavigate();
    const e = useRouteError();

    const error = errors[e?.status ?? 'default'] ?? errors['default'];

    return (
        <>
            <Center className={styles.background}>
                {e?.status || error.code}
            </Center>
            <div className={styles.center}>
                <h1 className={styles.title}>{error.title}</h1>
                <span className={styles.message}>{error.message}</span>
                <Button
                    onClick={() => navigate(error.code === 404 ? -1 : 0)}
                    size='lg'
                    w={220}
                >
                    {error.code === 404 ? 'Take me back' : 'Refresh page'}
                </Button>
                <Button
                    onClick={() => navigate('/')}
                    size='compact-sm'
                    variant='subtle'
                    w={220}
                >
                    Return to home page
                </Button>
            </div>
        </>
    )
}
