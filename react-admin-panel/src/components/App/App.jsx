import { useMemo } from 'react';
import { useCookies } from 'react-cookie';
import { AppShell, Center, Loader } from '@mantine/core';
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";

import LoginPage from '../../Pages/Login/LoginPage.jsx';
import VMPreviewPage from '../../Pages/VMDisplay/VMPreviewPage.jsx';
import NavBar from '../NavBar/NavBar.jsx';

import useFetch from '../../api/useFetch.jsx';
import Redirect from '../Redirect/Redirect.jsx';

function App() {
    const [cookies, setCookies] = useCookies(['token']);
    const setToken = (token) => setCookies('token', token, {path: '/'});

    const authOptions = useMemo(() => cookies.token ? {
            headers: {
                'accept': 'application/json',
                'Authorization': 'Bearer ' + cookies.token,
            }
        } : null, [cookies.token]);
    const authFetch = (path) => useFetch(path, cookies.token, authOptions);

    const {loading: authLoading, error: authError, data: user} = authFetch('user');

    if(authLoading) return <Center h='100vh'><Loader/></Center>
    if(authError) return <LoginPage token={cookies.token} setToken={setToken}/>

    return (
        <Router>
            <AppShell
                navbar={{
                    width: '310px',
                    breakpoint: 'sm',
                }}
                padding="md"
            >

                <AppShell.Navbar>
                    <NavBar logout={() => setToken('')} user={user}/>
                </AppShell.Navbar>

                <AppShell.Main>
                    <Routes>
                        <Route exact path='/' element={<Redirect to='/virtual-machines'/>}/>
                        <Route path='/virtual-machines' element={<VMPreviewPage authFetch={authFetch}/>}/>
                        <Route path='/virtual-machines/:id' element={'/virtual-machines/:id'}/>
                        <Route path='/desktops' element={'/desktops'}/>
                        <Route path='/network-panel' element={'/network-panel'}/>
                    </Routes>    
                </AppShell.Main>
            </AppShell>
        </Router>
        
    )
}

export default App
