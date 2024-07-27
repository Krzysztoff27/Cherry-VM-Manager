import { useEffect, useState } from "react";
import { API_URL, validPath } from '../api/api.jsx';

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
                    setData(null);
                    setError(response);
                    setLoading(false);
                }
                else{
                    const json = await response.json();
                    setData(json);
                    setError(null);
                    setLoading(false);
                }
            } catch (err) {
                setData(null);
                setError(err);
                setLoading(false);
            }
        };
        fetchData();
    }, [path, token, options]);

    return { loading, error, data };
}

export default useFetch;