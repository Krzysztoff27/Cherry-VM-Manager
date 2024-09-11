import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useFetch from '../../hooks/useFetch.jsx';
import useAuth from '../../hooks/useAuth.jsx';
import Loading from '../Loading/Loading.jsx';

/**
 * A wrapper component that protects authentication-restricted routes. It fetches user data
 * and determines if the user is allowed access or should be blocked.
 * 
 * While user data is being fetched, the <Loading/> component is displayed
 * 
 * If an error occurs during the data load, the component checks whether the error status code is 401 (Unauthorized).
 * If so, the user is redirected to the login page or home page. 
 * For other types of errors, the component throws the error, leaving it to be handled by the ErrorBoundary component.
 * 
 * @throws {Response} Throws the error response object if an unexpected error occurs.
 * 
 * If authentication is successful and the user data is successfully retrieved, the component renders 
 * the react-router-dom's <Outlet/> component, allowing access to the protected routes.
 * 
 * @returns {React.JSX.Element} <Outlet/>
 */
export const Protected = () => {
    const location = useLocation();
    const { authOptions } = useAuth();
    const { error, loading, data: user } = useFetch('user', authOptions);

    if (loading) return <Loading/>;
    if (!error && user) return <Outlet />;
    
    if (error.status === 401) return <Navigate to={location.pathname === '/home' ? '/' : '/login'} />;
    throw error;
}

/**
 * A wrapper component for the login page, responsible for ensuring that authenticated users don't end up or get stuck on the login page.
 * Similarly to the Protected component, it fetches user data and determines whether user should be redirected or not.
 * 
 * While user data is being fetched, the <Loading/> component is displayed
 * 
 * If an error occures, checks if its status code is from the server errors range.
 * If so, the component throws the error, leaving it to be handled by the ErrorBoundary component.
 * 
 * If authentication is successful and the user data is successfully retrieved, it redirects the user to the panel
 * specifically: /virtual-machines path
 * 
 * If authentication failed, returns react-router-dom's <Outlet/> component, allowing user to access the login page.
 * @returns {React.JSX.Element} <Outlet/>
 */

export const ReverseProtected = () => {
    const { authOptions } = useAuth();
    const { loading, error, data: user } = useFetch('user', authOptions);

    if (loading) return <Loading/>;
    if (error?.status >= 500) throw error; 
    if (user) return <Navigate to="/virtual-machines"/>

    return <Outlet /> 
}

export default { Protected, ReverseProtected };
