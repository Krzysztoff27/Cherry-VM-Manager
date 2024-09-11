import handleFetch from "../handlers/handleFetch";
import useErrorHandler from "./useErrorHandler";

/**
 * Custom react hook for sending requests to the Cherry API
 * 
 * @typedef {Object} useApiReturn
 * @property {function} getPath - combines given relative path with the base API URL
 * @property {function} get - Sends a GET request to the API
 * @property {function} post - Sends a POST request to the API
 * @property {function} put - Sends a PUT request to the API
 * 
 * @returns {useApiReturn} obj
 */
export const useApi = () => {
    const errorHandler = useErrorHandler();
    const API_URL = import.meta.env.VITE_API_BASE_URL;

    const validPath = (path = '') => path.startsWith('/') ? path : `/${path}`;

    /**
     * Combines given relative path with the base API URL
     * @param {string} path
     * @returns {string} absolute path
     */
    const getPath = (path) => API_URL ? `${API_URL}${validPath(path)}` : undefined;

    /**
     * Sends a GET request to the API
     * @param {string} path - path relative to the configured base API URL
     * @param {Object} options - additional options for the fetch
     * @returns {object|undefined} json response
     */
    const get = async (path, options = {}) => 
        await handleFetch(getPath(path), options, errorHandler);

    /**
     * Sends a POST request to the API
     * @param {string} path - path relative to the configured base API URL
     * @param {Object} body - body to be sent in the request
     * @param {Object} options - additional options for the fetch
     * @returns {object|undefined} json response
     */
    const post = async (path, body = {}, options = {}) => 
        await handleFetch(getPath(path), {
                ...options,
                method: 'POST',
                body: body,
            }, errorHandler);

    /**
     * Sends a PUT request to the API
     * @param {string} path - path relative to the configured base API URL
     * @param {Object} body - body to be sent in the request
     * @param {Object} options - additional options for the fetch
     * @returns {object|undefined} json response
     */
    const put = async (path, body = {}, options = {}) => 
        await handleFetch(getPath(path), {
                ...options,
                method: 'PUT',
                body: body,
            }, errorHandler);

    return { getPath, get, post, put };
};

export default useApi;