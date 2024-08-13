import { useMemo } from 'react';
import { useCookies } from 'react-cookie';
import { Center, Loader } from '@mantine/core';
import { Route, BrowserRouter as Router, Routes, useLocation, useNavigate } from "react-router-dom";

import LoginPage from '../../Pages/Login/LoginPage.jsx';
import MachineMainPage from '../../Pages/VirtualMachines/MachineMainPage.jsx';
import MachinePage from '../../Pages/VirtualMachines/MachinePage.jsx';
import Redirect from '../Redirect/Redirect.jsx';
import Layout from '../Layout/Layout.jsx';

import useFetch from '../../hooks/useFetch.jsx';
import NavBar from '../NavBar/NavBar.jsx';
import NetworkPanel from '../../Pages/NetworkPanel/NetworkPanel.jsx';

function App() {
    return (
        <Router>
            <AppRoutes/>
        </Router>
    )
}

function AppRoutes(){
    const navigate = useNavigate();
    const location = useLocation();

    const [cookies, setCookies] = useCookies(['token']);
    const setToken = (token) => setCookies('token', token, {path: '/'});
    const logout = () => setToken('')

    const authOptions = useMemo(() => cookies.token ? {
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + cookies.token,
            }
        } : null, [cookies.token]);
    const authFetch = (path) => useFetch(path, cookies.token, authOptions);

    const {loading: authLoading, error: authError, data: user} = authFetch('user');
    
    if(authLoading) return <Center h='100vh'><Loader/></Center>
    if(authError && location.pathname !== '/login') navigate('/login')
    else if(user && location.pathname === '/login') navigate('/');

    return (
        <Routes>
            <Route path='/login' element={<LoginPage token={cookies.token} setToken={setToken}/>}/>
            <Route element={
                <Layout navbar={
                    <NavBar logout={logout} user={user}/>
                }/>
            }> 
                <Route exact path='/'               element={<Redirect to='/virtual-machines'/>}/>
                <Route path='/virtual-machines'     element={<MachineMainPage   authFetch={authFetch} logout={logout}/>}/>
                <Route path='/virtual-machines/:id' element={<MachinePage       authFetch={authFetch} authOptions={authOptions} logout={logout}/>}/>
                <Route path='/desktops'             element={'/desktops'}/>
                <Route path='/network-panel'        element={<NetworkPanel      authFetch={authFetch} authOptions={authOptions}/>}/>   
            </Route>
        </Routes>
    )
}

export default App
