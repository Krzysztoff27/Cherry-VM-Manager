import './App.css';
import './Fonts.css';
import useLocalStorage from 'use-local-storage';
import Toggle from '../Toggle/Toggle';
import VMDataDisplay from '../VMDataDisplay/VMDataDisplay';

function App() {
    const [isDarkMode, setIsDarkMode] = useLocalStorage('isDarkMode', true);

    const changeColorMode = () => setIsDarkMode(!isDarkMode);

    return (
        <div id='App' color-mode={isDarkMode ? 'dark' : 'light'}>
            <header>
                <Toggle 
                    label={isDarkMode ? 'Dark mode' : 'Light mode'}
                    id='colorModeToggle' 
                    isChecked={isDarkMode} 
                    handleChange={changeColorMode}
                />
            </header>
            <main>
                <nav></nav>
                <VMDataDisplay/>
            </main>
        </div>
    )
}

export default App
