import { Grid, Paper, rem, ScrollArea } from "@mantine/core";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import MachineStateChart from "./components/MachineStateChart/MachineStateChart";
import StretchingColumn from "./components/StretchingColumn/StretchingColumn";
import NetworkDataDisplay from "./components/NetworkDataDisplay/NetworkDataDisplay";
import { clockSynchronizedTimeout } from "../../utils/misc";
import useAuth from "../../hooks/useAuth";
import useApi from "../../hooks/useApi";
import ConsoleDisplay from "./components/ConsoleDisplay/ConsoleDisplay";

export default function MachinePage() {
    const { get } = useApi();
    const { id } = useParams();
    const { authOptions } = useAuth();
    const [currentState, setCurrentState] = useState({ loading: true })

    const loadState = async () => setCurrentState(await get(`vm/${id}/state`, authOptions));

    useEffect(() => {
        const clear = clockSynchronizedTimeout(loadState, 1)
        return () => clear();
    }, []);

    return (
        <Grid display='flex' mah='100%'>
            <StretchingColumn span={6} h='45%'>
                <NetworkDataDisplay id={id} currentState={currentState} authOptions={authOptions} />
            </StretchingColumn>
            <StretchingColumn span={6} h='45%'>
                <ConsoleDisplay id={id}/>
            </StretchingColumn>
            <StretchingColumn span={12} h='55%'>
                <MachineStateChart currentState={currentState} />
            </StretchingColumn>
        </Grid >

    )
}
