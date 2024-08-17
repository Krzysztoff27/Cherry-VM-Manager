const API_URL = 'http://localhost:8000';
const validPath = (path = '') => path.startsWith('/') ? path : `/${path}`;
export const getPath = (path) => API_URL ? `${API_URL}${validPath(path)}` : undefined;

export default {getPath};