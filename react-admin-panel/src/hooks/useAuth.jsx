import { useMemo, useCallback } from "react";
import { useCookies } from "react-cookie";

function useAuth() {
    const [cookies, setCookies] = useCookies(['token']);
    
    const setToken = useCallback((token) => setCookies('token', token, { path: '/' }), [setCookies]);
    const logout = useCallback(() => setToken(''), [setToken]);
    
    const token = useMemo(() => cookies.token, [cookies.token]);
    const authOptions = useMemo(() => {
        return cookies.token ? {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + cookies.token,
            }
        } : null;
    }, [token]);

    return {
        token,
        setToken,
        logout,
        authOptions,
    };
}

export default useAuth;