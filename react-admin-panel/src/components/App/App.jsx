import { useMemo } from 'react';
import { useCookies } from 'react-cookie';
import { AppShell } from '@mantine/core';
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import useFetch from '../../hooks/useFetch.jsx';

import LoginPage from '../../Pages/Login/LoginPage.jsx';
import NavBar from '../NavBar/NavBar.jsx';

import './Fonts.css';


const API_URL = 'http://localhost:8000';

function App() {
    const [cookies, setCookies] = useCookies(['token']);
    
    const setToken = (token) => setCookies('token', token, {path: '/'});
    const AUTH_OPTIONS = useMemo(() => cookies.token ? {
        headers: {
            'accept': 'application/json',
            'Authorization': 'Bearer ' + cookies.token,
        }
    } : null, [cookies.token]);

    const {loading: authLoading, error: authError, data: user} = useFetch(API_URL + '/user', AUTH_OPTIONS);


    if(authError) return <LoginPage setToken={setToken} API_URL={API_URL}/>

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
                    <NavBar logout={() => setToken('')} user={user} API_URL={API_URL} AUTH_OPTIONS={AUTH_OPTIONS}/>
                </AppShell.Navbar>

                <AppShell.Main>
                    <Routes>
                        <Route exact path='/' element={'/'}/>
                        <Route path='/virtual-machines' element={'/virtual-machines'}/>
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
