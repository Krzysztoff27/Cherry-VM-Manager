import { useMemo } from 'react';
import { useCookies } from 'react-cookie'
import {BrowserRouter as Router, Routes, Route} from "react-router-dom";
import useLocalStorage from 'use-local-storage';

import MainPage from '../../Pages/Main/MainPage.jsx';
import NetworkPanel from '../../Pages/NetworkPanel/NetworkPanel.jsx';
import VirtualMachine from '../../Pages/VirtualMachine/VirtualMachine.jsx';
import LoginPage from '../../Pages/Login/LoginPage.jsx';
import Header from '../Header/Header.jsx';
import useFetch from '../../hooks/useFetch.jsx';
import UsersPage from '../../Pages/UsersPage/UsersPage.jsx';

import './App.css';
import './Fonts.css';

const API_URL = 'http://localhost:8000';

function App() {
    const [cookies, setCookies] = useCookies(['token']);
    const [isDarkMode, setIsDarkMode] = useLocalStorage('isDarkMode', true);

    const authOptions = useMemo(() => cookies.token ? {
        headers: {
            'accept': 'application/json',
            'Authorization': 'Bearer ' + cookies.token,
        }
    } : null, [cookies.token]);

    const {loading: authLoading, error: authError, data: user} = useFetch(API_URL + '/user', authOptions);

    const changeColorMode = () => setIsDarkMode(!isDarkMode);
    const setToken = (token) => setCookies('token', token, {path: '/'});

    if(authLoading || authError) return ( 
        <div id='App' color-mode={isDarkMode ? 'dark' : 'light'}>
            <LoginPage setToken={setToken} API_URL={API_URL}/>
        </div>
    )

    return (
        <Router>
            <div id='App' color-mode={isDarkMode ? 'dark' : 'light'}>
                <Header isDarkMode={isDarkMode} changeColorModeFunc={changeColorMode} user={user} logoutFunc={() => setToken(null)}/>
                <main>
                    <Routes>
                        <Route exact path='/' element={<MainPage/>}/>
                        <Route path='/vm/:id' element={<VirtualMachine/>}/>
                        <Route path='/uzytkownicy' element={<UsersPage/>}/>
                        <Route path='/panel-sieci' element={<NetworkPanel/>}/>
                    </Routes>
                </main>
            </div>
        </Router>
    )
}

export default App
