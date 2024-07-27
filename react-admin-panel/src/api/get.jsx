import { API_URL, validPath } from './api.jsx';

async function get(path, options = {}) {
    if(!API_URL) {
        throw new Error('API URL not set')
    }

    return await fetch(`${API_URL}${validPath(path)}`, {
        headers: {
            'accept': 'application/json'
        },
        ...options
    }).catch(err => new Response(null, {
        status: 503,
        statusText: 'No response from the server',
        headers: {
            'Content-Type': 'text/plain'
        }
    }));
}

export default get;