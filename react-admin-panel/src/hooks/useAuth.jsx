import { useMemo, useCallback } from "react";
import { useCookies } from "react-cookie";
import { useNavigate } from "react-router-dom";

/**
 * Custom react hook providing application with authentication support.
 * 
 * @typedef {Object} useAuthReturn
 * @property {string|null} token - memoized value of token extracted from cookies.
 * @property {function} setToken - sets the token value in the browser's cookies.
 * @property {function} logout - sets token value to null and redirects user to the login page.
 * @property {object|null} authOptions - fetch options provided with headers required for API authentication.
 * 
 * @returns {useAuthReturn}
 */
export default function useAuth() {
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