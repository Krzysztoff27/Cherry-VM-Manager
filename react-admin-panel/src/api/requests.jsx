import { API_URL, validPath } from './api.jsx';

const getPath = (path) => API_URL ? `${API_URL}${validPath(path)}` : undefined;

const handleFetch = async (URL, options = {}, errorHandler) => {
    if(!URL) throw new Error('API URL not set');

    const fetchOptions = {
        headers: {'accept': 'application/json'},
        ...options,
    }

    const response = await fetch(URL, fetchOptions)
        .catch(_ => 
            new Response(JSON.stringify({detail: 'No response from the server'}), {
                status: 503,
                headers: {'Content-Type': 'text/plain'},
            })
        );
    const json = await response.json();

    if(!response.ok) return errorHandler.handleErrorResponse(response, json);
    return json;
}

export const get = async (path, options = {}, errorHandler) => await handleFetch(getPath(path), options, errorHandler);

export const post = async (path, body = {}, options = {}, errorHandler) => 
    await handleFetch(getPath(path), {
            ...options,
            method: 'POST',
            body: body,
        },
    errorHandler);

export const put = async (path, body = {}, options = {}, errorHandler) => 
    await handleFetch(getPath(path), {
            ...options,
            method: 'PUT',
            body: body,
        },
    errorHandler);

export default {get, post, put}