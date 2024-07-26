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
  colors: {
    'suse-green':
    [
      "#f2fde7",
      "#e7f7d5",
      "#cfeeac",
      "#b5e57f",
      "#9ede5a",
      "#90d941",
      "#89d634",
      "#75bd26",
      "#67a81d",
      "#55920f"
    ],
    'suse-cyan': [
      "#e5fdfb",
      "#d7f5f3",
      "#b2e9e3",
      "#89ddd3",
      "#68d1c6",
      "#52cbbe",
      "#44c8ba",
      "#33b0a3",
      "#239e91",
      "#00897e"
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
