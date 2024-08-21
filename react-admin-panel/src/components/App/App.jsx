import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider, Routes } from "react-router-dom";
import { Center } from "@mantine/core";

import Layout from "../Layout/Layout.jsx"
import LoginPage from '../../pages/Login/LoginPage.jsx';
import {Protected, ReverseProtected} from "../Protected/Protected.jsx";
import MachineList from "../../pages/VirtualMachines/MachineList.jsx"
import MachinePage from "../../pages/VirtualMachines/MachinePage.jsx"
import NetworkPanel from "../../pages/NetworkPanel/NetworkPanel.jsx"
import Desktops from "../../pages/Desktops/Desktops.jsx";

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route path="/">
            <Route exact path="/" element={<Center h={'70vh'}><h1>Strona powstaje...</h1></Center>}/>
            <Route element={<Protected/>}>
                <Route element={<Layout/>}>
                    <Route path='/virtual-machines'     element={<MachineList/>}/>
                    <Route path='/virtual-machines/:id' element={<MachinePage/>}/>
                    <Route path='/desktops'             element={<Desktops/>}/>
                    <Route path='/network-panel'        element={<NetworkPanel/>}/>    
                </Route>
            </Route>
            <Route element={<ReverseProtected/>}>
                <Route path="/login" element={<LoginPage />} />
            </Route>
        </Route>
    )
);

function App() {
    return (
        <RouterProvider router={router} />
    )
}

export default App
