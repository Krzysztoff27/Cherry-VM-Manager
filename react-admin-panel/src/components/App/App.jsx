import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider, Routes } from "react-router-dom";
import { Center } from "@mantine/core";

import Layout from "../Layout/Layout.jsx"
import LoginPage from '../../pages/Login/LoginPage.jsx';
import Protected from "../Protected/Protected.jsx";
import MachineList from "../../pages/VirtualMachines/MachineList.jsx"
import MachinePage from "../../pages/VirtualMachines/MachinePage.jsx"
import NetworkPanel from "../../pages/NetworkPanel/NetworkPanel.jsx"
import ErorrHandler from "../../handlers/errorHandler.jsx";

const errorHandler = new ErorrHandler();

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route path="/">
            <Route element={<Protected/>}>
                <Route element={<Layout/>}>
                    <Route path='/virtual-machines'     element={<MachineList errorHandler={errorHandler}/>}/>
                    <Route path='/virtual-machines/:id' element={<MachinePage errorHandler={errorHandler}/>}/>
                    <Route path='/desktops'             element={<Center h={'70vh'}><h1>/desktops - Strona powstaje...</h1></Center>}/>
                    <Route path='/network-panel'        element={<NetworkPanel errorHandler={errorHandler}/>}/>    
                </Route>
            </Route>
            <Route exact path="/" element={<Center h={'70vh'}><h1>Strona powstaje...</h1></Center>}/>
            <Route path="/login" element={<LoginPage />} />
        </Route>
    )
);

function App() {
    return <RouterProvider router={router} />
}

export default App
