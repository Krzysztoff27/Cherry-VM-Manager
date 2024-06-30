import './App.css';
import './Fonts.css';
import { useState } from 'react';
import useLocalStorage from 'use-local-storage';
import Toggle from '../Toggle/Toggle';
import Card from '../Card/Card';
import MainPage from '../../Pages/Main/MainPage.jsx';
import NetworkPanel from '../../Pages/NetworkPanel/NetworkPanel.jsx';
import VirtualMachine from '../../Pages/VirtualMachine/VirtualMachine.jsx';
import {BrowserRouter as Router, Routes, Route} from "react-router-dom";

function App() {
    const [isDarkMode, setIsDarkMode] = useLocalStorage('isDarkMode', true);

    const changeColorMode = () => setIsDarkMode(!isDarkMode);              

    return (
        <Router>
            <div id='App' color-mode={isDarkMode ? 'dark' : 'light'}>
                <header>
                    <h3>🍒 Wiśniowy Panel Kontrolny</h3>
                    
                    <Toggle 
                        label={isDarkMode ? 'Tryb ciemny' : 'Tryb jasny'}
                        id='colorModeToggle' 
                        isChecked={isDarkMode} 
                        handleChange={changeColorMode}
                    />
                </header>
                <main>
                    <nav>
                        <Card name="Strona Główna" link='/'/>
                        {/* <Card name="Panel Sieci" link='/panel-sieci'/> */}
                        <Card name="Desktop 1" link='/wirtualka/1'/>
                    </nav>
                    
                    <Routes>
                        <Route exact path='/' element={<MainPage/>}/>
                        {/* <Route path='/panel-sieci' element={<NetworkPanel/>}/> */}
                        <Route path='/wirtualka/:id' element={<VirtualMachine/>}/>
                    </Routes>
                </main>
            </div>
        </Router>
    )
}

export default App
