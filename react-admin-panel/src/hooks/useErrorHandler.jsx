import { notifications } from "@mantine/notifications";
import { IconX } from "@tabler/icons-react";
import useAuth from "../hooks/useAuth";

const useErrorHandler = (defaultOptions = {}) => {
    const { token, setToken } = useAuth();

    const showErrorNotification = (options) => {
        const notificationOptions = {
            id: 'albatrosy',
            withCloseButton: true,
            loading: false,
            autoClose: 10000,
            className: 'error-class',
            color: 'red',
            icon: <IconX />,
            ...defaultOptions,
            ...options,
        };

        notifications.show(notificationOptions);
    };

    const scriptError = (error, notificationOptions = {}) => {
        showErrorNotification({
            title: 'Error occured',
            message: `${error.name}: ${error.message}`,
            ...notificationOptions,
        })
    }

    const requestResponseError = async (response = new Response(), data = {}) => {
        const options = { id: response?.status };

        switch (response?.status) {
            case 400:
                showErrorNotification({
                    ...options,
                    title: 'Improper request',
                    message: 'API service denied the request due to client error.',
                });
                break;
            case 401:
                if (token) setToken(null);
                switch (data?.detail) {
                    case 'Incorrect username or password':
                        showErrorNotification({
                            ...options,
                            title: 'Login failed',
                            message: data?.detail,
                        });
                        break;
                    default:
                        showErrorNotification({
                            ...options,
                            title: 'Session expired',
                            message: 'Please log in to the panel again.',
                        });
                }
                break;
            case 409:
                switch (data?.detail) {
                    case 'Snapshot with this name already exists':
                        showErrorNotification({
                            ...options,
                            title: 'Nie udało się stworzyć migawki',
                            message: 'Migawka o tej nazwie już istnieje.'
                        })
                }
            case 503:
                showErrorNotification({
                    ...options,
                    title: 'Error occured',
                    message: 'API service is not responding.',
                });
                break;

            default:
                showErrorNotification({
                    ...options,
                    title: 'Error occured',
                    message: data?.detail || 'Unknown error code.',
                });
                
                console.error('Unhandled error response:', response, data);
        }
    };

    return { scriptError, requestResponseError };
};

export default useErrorHandler;
