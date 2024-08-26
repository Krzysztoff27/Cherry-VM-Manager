import { notifications } from "@mantine/notifications";
import { IconX } from "@tabler/icons-react";
import useAuth from "../hooks/useAuth";

export default class ErrorHandler {
    constructor(defaultOptions = {}){
        this.defaultOptions = {
            autoClose: 10000,
            className: 'error-class',
            color: 'red',
            icon: <IconX />,
            ...defaultOptions,
        };
    }

    showErrorNotification = (options) => {
        const notificationOptions = {
            withCloseButton: true,
            loading: false,
            ...this.defaultOptions,
            ...options,
        };

        notifications.show(notificationOptions);
    };

    requestResponseError = async (response = new Response(), data = {}) => {
        const {token, setToken} = useAuth();
        const options = {id: response?.status ?? 'albatrosy'}

        switch (response?.status) {
            // 4xx
            case 400:
                this.showErrorNotification({
                    ...options,
                    title: 'Niepoprawne żądanie',
                    message: 'server nie był w stanie spełnić żądania'
                })
            case 401:
                if(token) setToken(null);
                switch (data?.detail) {
                    case 'Incorrect username or password':
                        this.showErrorNotification({
                            ...options,
                            title: 'Logowanie nie powiodło się',
                            message: 'Niepoprawny login lub hasło.',
                        });
                        break;
                    default:
                        this.showErrorNotification({
                            ...options,
                            title: 'Sesja wygasła',
                            message: 'Proszę ponownie zalogować się do panelu.',
                        });
                }
                break;
            //5xx
            case 503:
                this.showErrorNotification({
                    ...options,
                    title: 'Wystąpił błąd',
                    message: 'Usługa API nie odpowiada.',
                });
                break;

            default:
                this.showErrorNotification({
                    ...options,
                    title: 'Wystąpił błąd',
                    message: data?.detail || 'Nieznany błąd',
                });
                
                console.error('Unhandled error response:', response, data);
        }
    }
}