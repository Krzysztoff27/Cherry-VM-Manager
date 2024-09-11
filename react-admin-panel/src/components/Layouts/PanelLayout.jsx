import { AppShell } from "@mantine/core";
import { Outlet } from "react-router-dom";
import NavBar from '../NavBar/NavBar.jsx';
import styles from './PanelLayout.module.css';

/**
 * Layout for the panel, consisting of navigational bar for moving between important sections of the panel
 * @returns {React.JSX.Element} Layout element
 */
export default function PanelLayout() {
    return (
        <AppShell
            navbar={{ width: '75px', breakpoint: 'sm' }}
            padding="md"
            className={styles.appShell}
        >
            <AppShell.Navbar><NavBar /></AppShell.Navbar>
            <AppShell.Main className={styles.appshellMain}>
                <Outlet />
            </AppShell.Main>
        </AppShell>
    )
}
