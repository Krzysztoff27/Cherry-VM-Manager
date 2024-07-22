export const API_URL = 'http://localhost:8000';
export const validPath = (path = '') => path.startsWith('/') ? path : `/${path}`;

export default {API_URL, validPath};