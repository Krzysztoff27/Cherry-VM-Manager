const handleFetch = async (URL, options = {}, errorHandler) => {
    if(!URL) throw {status: 601, message: `Environmental variable "VITE_API_BASE_URL" is either not set or its value is invalid.`};

    const fetchOptions = {
        headers: {'accept': 'application/json'},
        ...options,
    }

    const response = await fetch(URL, fetchOptions)
        .catch(e => new Response(JSON.stringify({detail: 'No response from the server'}), {
                status: 503,
                headers: {'Content-Type': 'text/plain'},
            })
        );

    // handle no content reponses
    const text = await response.text(); 
    const json = text ? JSON.parse(text) : {};

    if(!response.ok) return errorHandler.requestResponseError(response, json);
    return json;
}

export default handleFetch;