import { useMemo, useRef } from 'react';
import { useCookies } from 'react-cookie';
import { Center, Loader } from '@mantine/core';
import { Route, BrowserRouter as Router, Routes, useLocation, useNavigate } from "react-router-dom";

import LoginPage from '../../pages/Login/LoginPage.jsx';
import MachineMainPage from '../../pages/VirtualMachines/MachineMainPage.jsx';
import MachinePage from '../../pages/VirtualMachines/MachinePage.jsx';
import Redirect from '../Redirect/Redirect.jsx';
import Layout from '../Layout/Layout.jsx';

import useFetch from '../../hooks/useFetch.jsx';
import NavBar from '../NavBar/NavBar.jsx';
import NetworkPanel from '../../pages/NetworkPanel/NetworkPanel.jsx';
import ErorrHandler from '../../handlers/errorHandler.jsx';

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
    
    const errorHandler = useRef(new ErorrHandler(setToken)).current;
    const authOptions = useMemo(() => cookies.token ? {
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + cookies.token,
            }
        } : null, [cookies.token]);
    const authFetch = (path) => useFetch(path, cookies.token, authOptions);

    const {loading, error, data: user} = authFetch('user');
    
    if(loading) return <Center h='100vh'><Loader/></Center>
    if(error && location.pathname !== '/login') navigate('/login')
    else if(user && location.pathname === '/login') navigate('/');

    return (
        <Routes>
            <Route path='/login' element={<LoginPage token={cookies.token} setToken={setToken} errorHandler={errorHandler}/>}/>
            <Route element={
                <Layout navbar={
                    <NavBar logout={logout} user={user}/>
                }/>
            }> 
                <Route exact path='/'               element={<Redirect to='/virtual-machines'/>}/>
                <Route path='/virtual-machines'     element={<MachineMainPage   authFetch={authFetch} logout={logout} errorHandler={errorHandler}/>}/>
                <Route path='/virtual-machines/:id' element={<MachinePage       authFetch={authFetch} authOptions={authOptions} logout={logout} errorHandler={errorHandler}/>}/>
                <Route path='/desktops'             element={'/desktops'}/>
                <Route path='/network-panel'        element={<NetworkPanel      authFetch={authFetch} authOptions={authOptions} errorHandler={errorHandler}/>}/>   
            </Route>
        </Routes>
    )
}

export default App
