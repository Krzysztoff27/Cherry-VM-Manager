import { getPath } from "../api/api";
import handleFetch from "../api/handleFetch";
import useErrorHandler from "./useErrorHandler";

export const useApi = () => {
    const errorHandler = useErrorHandler();

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

    return { get, post, put };
};

export default useApi;