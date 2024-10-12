import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from "react-router-dom";

import PanelLayout from "../Layouts/PanelLayout.jsx"
import LoginPage from '../../pages/Login/LoginPage.jsx';
import {Protected, ReverseProtected} from "../Protected/Protected.jsx";
import MachineList from "../../pages/MachinesList/MachineList.jsx";
import VirtualMachinePage from "../../pages/VirtualMachine/VirtualMachinePage.jsx"
import NetworkPanel from "../../pages/NetworkPanel/NetworkPanel.jsx"
import Desktops from "../../pages/Desktops/Desktops.jsx";
import Home from "../../pages/Home/Home.jsx";
import ErrorBoundary from "../ErrorBoundary/ErrorBoundary.jsx";
import ConfigValidator from "../ConfigValidator/ConfigValidator.jsx";
import Credits from "../../pages/Credits/Credits.jsx";
import HomeLayout from "../Layouts/HomeLayout.jsx";
import Copyright from "../../pages/Copyright/Copyright.jsx";

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route element={<ConfigValidator/>} errorElement={<ErrorBoundary/>}>
            <Route element={<HomeLayout/>}>
                <Route exact path='/'           element={<Home/>}/>
                <Route path='/credits'          element={<Credits/>}/>
                <Route path='/copyright'        element={<Copyright/>}/>
            </Route>
            <Route element={<Protected/>}>
                <Route element={<PanelLayout/>}>
                    <Route path='/home'                 element={<Home/>}/>
                    <Route path='/virtual-machines'     element={<MachineList/>}/>
                    <Route path='/virtual-machines/:uuid' element={<VirtualMachinePage/>}/>
                    <Route path='/desktops'             element={<Desktops/>}/>
                    <Route path='/network-panel'        element={<NetworkPanel/>}/>    
                </Route>
            </Route>
            <Route element={<ReverseProtected/>}>
                <Route path='/login' element={<LoginPage/>}/>
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
