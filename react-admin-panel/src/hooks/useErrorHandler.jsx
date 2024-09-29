import { notifications } from "@mantine/notifications";
import { IconX } from "@tabler/icons-react";
import errors from "../assets/data/errorResponses.json";

/**
 * Custom react hook for handling with fetch request errors.
 * @param {*} defaultOptions 
 * @returns 
 */
const useErrorHandler = (defaultOptions = {}) => {
    /**
     * Gets approperiate error data based on the status code. 
     * If provided with error detail, it searches possible variants of error code for one matching the variant.
     * E.g.:
     * Error 401 by default returns object with title: "Unauthorized" and message: "You are not authorized to access this resource."
     * But when provided with detail "Wrong username or password", the function will search the Error 401 object's "variants" property
     * for a variant with message equal to the provided detail. 
     * In result, it will return an object with title: "Login failed" and message: "Wrong username or password"
     * 
     * @param {number|string} code - status code of the error
     * @param {string} detail - error message detail passed from the response body
     * @returns 
     */
    const getError = (code = 'default-notification', detail = '') => {
        let error = errors[code] ?? errors['default-notification'];
        if(error.variants && detail) error = error.variants.find(variant => variant.matches === detail) || error;

        return error;
    }

    const showErrorNotification = (options) => {
        const notificationOptions = {
            id: 'albatrosy',
            withCloseButton: true,
            loading: false,
            autoClose: 5000,
            className: 'error-class',
            color: 'red',
            icon: <IconX />,
            ...defaultOptions,
            ...options,
        };

        notifications.show(notificationOptions);
    };

    /**
     * Function for handling request response errors. Sends a Mantine notification with approperiate information for the user.
     * @param {Response} response - error response
     * @param {Object} body - json body of the error response
     */
    const requestResponseError = async (response = new Response(), body = {}) => {
        const code = response?.status;
        const error = getError(code, body.detail);
        const message = error.displayDetail ? body.detail : error.notification || error.message;

        showErrorNotification({
            id: `${code}-${Date.now()}`,
            title: error.title,
            message: message,
        })
    };

    return { requestResponseError, showErrorNotification };
};

export default useErrorHandler;
