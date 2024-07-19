import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './components/App/App.jsx'
import { createTheme, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

const theme = createTheme({
  defaultRadius: 'md',
  primaryColor: 'cherry',
  colors: {
    cherry: [
      "#fdedf1",
      "#f5d7de",
      "#eda9b9",
      "#e77a94",
      "#e15474",
      "#df3d60",
      "#df3155",
      "#c62546",
      "#b11f3e",
      "#9b1334"
    ]
  }
});


ReactDOM.createRoot(document.getElementById('root')).render(
  <MantineProvider theme={theme} defaultColorScheme="dark">
    <Notifications />
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </MantineProvider>,
)
