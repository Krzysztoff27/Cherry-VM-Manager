// https://medium.com/@umaishassan/private-protected-and-public-routes-in-react-router-v6-e8fb623aa81
import useFetch from '../../hooks/useFetch.jsx';
import useAuth from '../../hooks/useAuth.jsx';
import { Navigate, Outlet } from 'react-router-dom';

export const Protected = () => {
    const { authOptions } = useAuth();
    const { loading, data: user } = useFetch('user', authOptions);

    if (loading) return;

    return user ? <Outlet /> : <Navigate to="/login" />;
}

export const ReverseProtected = () => {
    const { authOptions, token } = useAuth();
    const { loading, error, data: user } = useFetch('user', authOptions);

    return error || !user || !token ? <Outlet /> : <Navigate to="/virtual-machines" />
}

export default { Protected, ReverseProtected };
