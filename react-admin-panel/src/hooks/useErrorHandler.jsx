import { notifications } from "@mantine/notifications";
import { IconX } from "@tabler/icons-react";
import useAuth from "../hooks/useAuth";
import errors from "../assets/data/responseErrors.json";

const useErrorHandler = (defaultOptions = {}) => {
    const { token, setToken } = useAuth();

    const getError = (code = 'default', detail = '') => {
        let error = errors[code] ?? errors['default'];
        if(error.variants && detail) error = error.variants.find(variant => variant.message === detail) || error;

        return error;
    }

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

    const requestResponseError = async (response = new Response(), body = {}) => {
        const code = response?.status;
        const error = getError(code, body.detail);
        const message = error.messageOverride ? error.message : body.detail || error.message;

        showErrorNotification({
            id: `${code}-${Date.now()}`,
            title: error.title,
            message: message,
        })
    };

    return { scriptError, requestResponseError };
};

export default useErrorHandler;
