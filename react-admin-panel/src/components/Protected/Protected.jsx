// https://medium.com/@umaishassan/private-protected-and-public-routes-in-react-router-v6-e8fb623aa81
import useFetch from '../../hooks/useFetch.jsx';
import useAuth from '../../hooks/useAuth.jsx';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Loading from '../Loading/Loading.jsx';

export const Protected = () => {
    const location = useLocation();
    const { authOptions } = useAuth();
    const { error, loading, data: user } = useFetch('user', authOptions);

    if (loading) return <Loading/>;
    if (!error && user) return <Outlet />;
    
    if (error.status === 401) return <Navigate to={location.pathname === '/home' ? '/' : '/login'} />;
    throw error;
}

export const ReverseProtected = () => {
    const { authOptions } = useAuth();
    const { loading, error, data: user } = useFetch('user', authOptions);

    if (loading) return <Loading/>;
    if (error?.status >= 500) throw error; 
    if (user) return <Navigate to="/virtual-machines"/>

    return <Outlet /> 
}

export default { Protected, ReverseProtected };
