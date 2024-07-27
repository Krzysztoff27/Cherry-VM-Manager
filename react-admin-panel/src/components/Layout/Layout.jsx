import { AppShell } from "@mantine/core";
import { Outlet } from "react-router-dom";

export default function Layout({navbar}) {
    return (
        <AppShell navbar={{ width: '75px', breakpoint: 'sm' }} padding="md">
            <AppShell.Navbar>{navbar}</AppShell.Navbar>
            <AppShell.Main>
                <Outlet />
            </AppShell.Main>
        </AppShell>
    )
}
