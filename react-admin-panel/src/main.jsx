import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './components/App/App.jsx'
import { createTheme, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './main.css';

const theme = createTheme({
  defaultRadius: 'md',
});


ReactDOM.createRoot(document.getElementById('root')).render(
  <MantineProvider theme={theme} defaultColorScheme="dark">
    <Notifications />
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </MantineProvider>,
)
