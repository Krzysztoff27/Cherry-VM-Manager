import { useEffect, useState } from "react";
import { API_URL, validPath } from './api.jsx';

const useFetch = (path, token = null, options = {}) => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const fetchURL = API_URL + validPath(path);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(fetchURL, options);
                if (!response.ok){
                    throw new Error(`Error: ${response.status} ${response.statusText}`);
                }
                
                const json = await response.json();
                setData(json);
                setError(null);
                setLoading(false);
            } catch (err) {
                setError(err);
                setLoading(false);
            }
        };
        fetchData();
    }, [path, token]);

    return { loading, error, data };
}

export default useFetch;