import { useEffect, useState } from "react";

/**
 * 
 * @param {String} url location of the JSON to fetch
 * @returns {Object}
 */
const useFetch = (url) => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(url);
                const json = await response.json();
                
                setData(json.data);
                setLoading(false);
            } 
            catch (err) {
                if(error?.status === undefined) setError({status: 404, message: 'Not found'});
                else setError(err);
                setLoading(false);
            }
        }
        fetchData();
    }, [url]);

    return { loading, error, data };
}

export default useFetch