import handleFetch from "../handlers/handleFetch";
import useErrorHandler from "./useErrorHandler";

export const useApi = () => {
    const errorHandler = useErrorHandler();
    const API_URL = import.meta.env.VITE_API_BASE_URL;

    const validPath = (path = '') => path.startsWith('/') ? path : `/${path}`;
    const getPath = (path) => API_URL ? `${API_URL}${validPath(path)}` : undefined;

    const get = async (path, options = {}) => 
        await handleFetch(getPath(path), options, errorHandler);

    const post = async (path, body = {}, options = {}) => 
        await handleFetch(getPath(path), {
                ...options,
                method: 'POST',
                body: body,
            }, errorHandler);

    const put = async (path, body = {}, options = {}) => 
        await handleFetch(getPath(path), {
                ...options,
                method: 'PUT',
                body: body,
            }, errorHandler);

    return { getPath, get, post, put };
};

export default useApi;