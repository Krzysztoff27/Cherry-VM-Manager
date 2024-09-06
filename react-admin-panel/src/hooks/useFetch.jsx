import { useEffect, useState } from "react";
import useApi from "./useApi";

const useFetch = (path, options = undefined) => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const {getPath} = useApi();

    const fetchURL = getPath(path);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(fetchURL, options)
                    .catch(err => new Response(null, {
                        status: 503,
                        statusText: 'No response from the server',
                        headers: {
                            'Content-Type': 'text/plain'
                        }
                    }));
                    
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
    }, [path, options]);

    return { loading, error, data };
}

export default useFetch;