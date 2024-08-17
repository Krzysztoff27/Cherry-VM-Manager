import { notifications } from "@mantine/notifications";
import { IconX } from "@tabler/icons-react";
import useAuth from "../hooks/useAuth";

const useErrorHandler = (defaultOptions = {}) => {
    const { token, setToken } = useAuth();

    const showErrorNotification = (options) => {
        const notificationOptions = {
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

    const handleErrorResponse = async (response = new Response(), data = {}) => {
        const options = { id: response?.status ?? 'albatrosy' };

        switch (response?.status) {
            case 400:
                showErrorNotification({
                    ...options,
                    title: 'Niepoprawne żądanie',
                    message: 'Serwer nie był w stanie spełnić żądania',
                });
                break;
            case 401:
                if (token) setToken(null);
                switch (data?.detail) {
                    case 'Incorrect username or password':
                        showErrorNotification({
                            ...options,
                            title: 'Logowanie nie powiodło się',
                            message: 'Niepoprawny login lub hasło.',
                        });
                        break;
                    default:
                        showErrorNotification({
                            ...options,
                            title: 'Sesja wygasła',
                            message: 'Proszę ponownie zalogować się do panelu.',
                        });
                }
                break;
            case 503:
                showErrorNotification({
                    ...options,
                    title: 'Wystąpił błąd',
                    message: 'Usługa API nie odpowiada.',
                });
                break;

            default:
                showErrorNotification({
                    ...options,
                    title: 'Wystąpił błąd',
                    message: data?.detail || 'Nieznany błąd',
                });
                
                console.error('Unhandled error response:', response, data);
        }
    };

    return { handleErrorResponse };
};

export default useErrorHandler;
