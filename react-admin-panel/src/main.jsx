import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './components/App/App.jsx'
import { createTheme, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.layer.css';
import '@mantine/notifications/styles.layer.css';
import '@mantine/charts/styles.layer.css';
import './main.css';

const theme = createTheme({
  fontFamily: 'FontAwesome, Poppins',
  defaultRadius: 'md',
  primaryColor: 'cherry',
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
    'cherry': [
      "#fff",     // 0
      "#fff",     // 1
      "#f54c56",  // 2 - subtle and light text
      "#f66069",  // 3
      "#f54c56",  // 4
      "#f43843",  // 5 - light background
      "#fa3244",  // 6
      "#ff2c45",  // 7 - filled
      "#e6283e",  // 8 - hover
      "#cc2337",  // 9
      "#ff1733",  // 10 - cherry color from logo
      "#d3172e",  // 11
      "#a61629",  // 12 - dark cherry color from logo
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
