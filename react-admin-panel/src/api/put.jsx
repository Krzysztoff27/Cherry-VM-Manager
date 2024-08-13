import { API_URL, validPath } from './api.jsx';

async function put(path, body, options = {}) {
    if(!API_URL) {
        throw new Error('API URL not set')
    }

    return await fetch(`${API_URL}${validPath(path)}`, {
        method: 'PUT', 
        headers: {
            'accept': 'application/json',
        },
        body: body,
        ...options,
    }).catch(err => new Response(null, {
        status: 503,
        statusText: 'No response from the server',
        headers: {
            'Content-Type': 'text/plain'
        }
    }));
}

export default put;