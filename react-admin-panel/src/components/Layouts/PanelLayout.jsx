import { AppShell, Container } from "@mantine/core";
import { Outlet } from "react-router-dom";
import NavBar from '../NavBar/NavBar.jsx';
import classes from './PanelLayout.module.css';

/**
 * Layout for the panel, consisting of navigational bar for moving between important sections of the panel
 * @returns {React.JSX.Element} Layout element
 */
export default function PanelLayout() {
    return (
        <AppShell
            padding="sm"
            className={classes.appShell}
        >
            <AppShell.Navbar w='75px'>
                <NavBar />
            </AppShell.Navbar>
            <AppShell.Main className={classes.appshellMain}>
                <Container fluid p='0' pr='4' h='100%' display='flex'>
                    <Outlet/>
                </Container>
            </AppShell.Main>
        </AppShell>
    )
}
