import { useMemo, useCallback } from "react";
import { useCookies } from "react-cookie";
import { useNavigate } from "react-router-dom";

function useAuth() {
    const [cookies, setCookies] = useCookies(['token']);
    const navigate = useNavigate();
    
    const setToken = useCallback((token) => setCookies('token', token, { path: '/' }), [setCookies]);
    const logout = useCallback(() => {
        setToken('');
        navigate('/login');
    }, [setToken]);
    
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