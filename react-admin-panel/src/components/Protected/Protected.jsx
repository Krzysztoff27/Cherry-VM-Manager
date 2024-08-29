// https://medium.com/@umaishassan/private-protected-and-public-routes-in-react-router-v6-e8fb623aa81
import useFetch from '../../hooks/useFetch.jsx';
import useAuth from '../../hooks/useAuth.jsx';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Loading from '../Loading/Loading.jsx';

export const Protected = () => {
    const location = useLocation();
    const { authOptions } = useAuth();
    const { loading, data: user } = useFetch('user', authOptions);

    if (loading) return <Loading/>;

    return user ? <Outlet /> : <Navigate to={location.pathname === '/home' ? '/' : '/login'} />;
}

export const ReverseProtected = () => {
    const { authOptions, token } = useAuth();
    const { loading, error, data: user } = useFetch('user', authOptions);

    if (user) return <Navigate to="/virtual-machines"/>
    if (loading) return <Loading/>;
    if (error && error.status !== 401) throw error; 

    return <Outlet /> 
}

export default { Protected, ReverseProtected };
