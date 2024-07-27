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
    });
}

export default get;