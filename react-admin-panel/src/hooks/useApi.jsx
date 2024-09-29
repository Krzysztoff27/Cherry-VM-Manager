import handleFetch from "../handlers/handleFetch";
import useErrorHandler from "./useErrorHandler";

/**
 * Custom react hook for sending requests to the Cherry API
 * 
 * @typedef {Object} useApiReturn
 * @property {function} getPath - combines given relative path with the base API URL
 * @property {function} getRequest - Sends a GET request to the API
 * @property {function} postRequest - Sends a POST request to the API
 * @property {function} deleteRequest - Sends a DELETE request to the API
 * 
 * @returns {useApiReturn} obj
 */
export const useApi = () => {
    const {requestResponseError} = useErrorHandler();
    const API_URL = import.meta.env.VITE_API_BASE_URL;

    const validPath = (path = '') => path.startsWith('/') ? path : `/${path}`;

    /**
     * Combines given relative path with the base API URL
     * @param {string} path
     * @returns {string} absolute path
    */
    const getPath = (path) => API_URL ? `${API_URL}${validPath(path)}` : undefined;

    /**
     * Sends a request of provided method to the API
     * @param {string} path - path relative to the configured base API URL
     * @param {string} method - HTTP request method
     * @param {Object} options - additional options for the fetch
     * @param {Object|undefined} body - if required, body for the request
     * @returns {object} response body
     */
    const sendRequest = async (path, method, options = {}, body = undefined, errorCallback) =>
        await handleFetch(getPath(path), {
            ...options,
            method: method,
            body: body,
        }, errorCallback);
    
    const getRequest    = (path, options = {}, errorCallback = requestResponseError) =>            sendRequest(path, 'GET', options, undefined, errorCallback);
    const deleteRequest = (path, options = {}, errorCallback = requestResponseError) =>            sendRequest(path, 'DELETE', options, undefined, errorCallback);
    const postRequest   = (path, body = {}, options = {}, errorCallback = requestResponseError) => sendRequest(path, 'POST', options, body, errorCallback);
    const putRequest    = (path, body = {}, options = {}, errorCallback = requestResponseError) => sendRequest(path, 'PUT', options, body, errorCallback);

    return { getPath, getRequest, postRequest, putRequest, deleteRequest };
};

export default useApi;