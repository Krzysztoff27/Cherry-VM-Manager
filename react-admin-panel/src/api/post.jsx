import { API_URL, validPath } from './api.jsx';

async function post(path, params = {}) {
    if(!API_URL) {
        throw new Error('API URL not set')
    }

    return await fetch(`${API_URL}${validPath(path)}`, {
        method: 'POST', 
        headers: {
            'accept': 'application/json',
        },
        body: new URLSearchParams(params)
    });
}

export default post;