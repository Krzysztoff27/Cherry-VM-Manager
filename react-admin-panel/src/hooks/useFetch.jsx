import { useEffect, useState } from "react";

/**
 * Custom hook to fetch data from a given URL with options
 * @param {String} url - location of the JSON to fetch
 * @param {Object} options - fetch options including headers
 * @returns {Object} - loading, error, and data state
 */
const useFetch = (url, options) => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(url, options);
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
        if(url) fetchData();
    }, [url, options]);

    return { loading, error, data };
}

export default useFetch;