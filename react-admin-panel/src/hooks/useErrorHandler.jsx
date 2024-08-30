import { notifications } from "@mantine/notifications";
import { IconX } from "@tabler/icons-react";
import errors from "../assets/data/errorResponses.json";

const useErrorHandler = (defaultOptions = {}) => {
    const getError = (code = 'default-notification', detail = '') => {
        let error = errors[code] ?? errors['default-notification'];
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
        const message = (error.detailOverride ? undefined : body.detail) || error.notification || error.message;

        showErrorNotification({
            id: `${code}-${Date.now()}`,
            title: error.title,
            message: message,
        })
    };

    return { scriptError, requestResponseError };
};

export default useErrorHandler;
