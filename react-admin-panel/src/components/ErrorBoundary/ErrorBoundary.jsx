import { Button, Center } from "@mantine/core";
import { useNavigate, useRouteError } from "react-router-dom"
import styles from './ErrorBoundary.module.css';
import errors from '../../assets/data/errorResponses.json';
import useAuth from "../../hooks/useAuth";


export default function ErrorBoundary() {
    const {logout} = useAuth();
    const navigate = useNavigate();
    const e = useRouteError();

    const error = errors[e?.status ?? 'default-boundary'] ?? errors['default-boundary'];

    let onClick, buttonMessage;

    switch(error.code){
        case 401:
        case 403:
            onClick = logout;
            buttonMessage = 'Log in again'
            break;
        case 404:
            onClick = () => navigate(-1);
            buttonMessage = 'Take me back';
            break;
        default:
            onClick = () => navigate(-1);
            buttonMessage = 'Refresh page';
    }

    return (
        <>
            <Center className={styles.background}>
                {e?.status || error.code}
            </Center>
            <div className={styles.center}>
                <h1 className={styles.title}>{error.title}</h1>
                <span className={styles.message}>{error.message}</span>
                <Button
                    onClick={onClick}
                    size='lg'
                    w={220}
                >
                    {buttonMessage}
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
