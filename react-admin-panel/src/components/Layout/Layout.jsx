import { AppShell } from "@mantine/core";
import { Outlet } from "react-router-dom";
import NavBar from '../NavBar/NavBar.jsx'

export default function Layout({}) {
    return (
        <AppShell navbar={{ width: '75px', breakpoint: 'sm' }} padding="md">
            <AppShell.Navbar><NavBar/></AppShell.Navbar>
            <AppShell.Main>
                <Outlet />
            </AppShell.Main>
        </AppShell>
    )
}
