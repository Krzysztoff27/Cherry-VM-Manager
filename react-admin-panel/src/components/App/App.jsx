import './App.css';
import './Fonts.css';
import { useState } from 'react';
import useLocalStorage from 'use-local-storage';
import Toggle from '../Toggle/Toggle';
import VMDisplay from '../Content/VM/VMDisplay.jsx';
import Card from '../Card/Card';
import MainPage from '../Content/MainPage/MainPage.jsx';
import NetworkPanel from '../Content/NetworkPanel/NetworkPanel.jsx';

function App() {
    const [isDarkMode, setIsDarkMode] = useLocalStorage('isDarkMode', true);
    const [currentDisplay, setCurrentDisplay] = useState('MainPage');

    const changeColorMode = () => setIsDarkMode(!isDarkMode);
    
    let content;
    switch(currentDisplay){
        case 'MainPage': content = <MainPage/>; break;
        case 'NetworkPanel': content = <NetworkPanel/>; break
        default: content = <VMDisplay currentDisplay={currentDisplay}/>;
    }                   

    return (
        <div id='App' color-mode={isDarkMode ? 'dark' : 'light'}>
            <header>
                <Toggle 
                    label={isDarkMode ? 'Tryb ciemny' : 'Tryb jasny'}
                    id='colorModeToggle' 
                    isChecked={isDarkMode} 
                    handleChange={changeColorMode}
                />
            </header>
            <main>
                <nav>
                    <Card id="MainPage" name="Strona Główna" setDisplay={setCurrentDisplay}/>
                    <Card id="NetworkPanel" name="Panel Sieci" setDisplay={setCurrentDisplay}/>
                    <Card id="Desktop1" name="Desktop 1" setDisplay={setCurrentDisplay}/>
                </nav>
                {content}
            </main>
        </div>
    )
}

export default App
