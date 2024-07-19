import { useMemo } from 'react';
import { useCookies } from 'react-cookie'
import {BrowserRouter as Router, Routes, Route} from "react-router-dom";

import LoginPage from '../../Pages/Login/LoginPage.jsx';

import useFetch from '../../hooks/useFetch.jsx';

import { AppShell, Loader } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

import './Fonts.css';
import NavBar from '../NavBar/NavBar.jsx';

const API_URL = 'http://localhost:8000';

function App() {
    const [cookies, setCookies] = useCookies(['token']);
    const [opened, { toggle }] = useDisclosure();
    
    const setToken = (token) => setCookies('token', token, {path: '/'});
    const authOptions = useMemo(() => cookies.token ? {
        headers: {
            'accept': 'application/json',
            'Authorization': 'Bearer ' + cookies.token,
        }
    } : null, [cookies.token]);

    const {loading: authLoading, error: authError, data: user} = useFetch(API_URL + '/user', authOptions);


    if(authError) return <LoginPage setToken={setToken} API_URL={API_URL}/>

    return (
        <Router>
            <AppShell
                navbar={{
                    width: '310px',
                    breakpoint: 'sm',
                    collapsed: { mobile: !opened },
                }}
                padding="md"
            >

                <AppShell.Navbar p="md">
                    <NavBar logout={() => setToken('')} user={user}/>
                </AppShell.Navbar>

                <AppShell.Main>
                    {
                        authLoading ? <Loader/> : 
                        <Routes>
                            <Route exact path='/' element={'/'}/>
                            <Route path='/virtual-machines' element={'/virtual-machines'}/>
                            <Route path='/desktops' element={'/desktops'}/>
                            <Route path='/network-panel' element={'/network-panel'}/>
                        </Routes>
                    }
                </AppShell.Main>
            </AppShell>
        </Router>
        
    )
}

export default App
