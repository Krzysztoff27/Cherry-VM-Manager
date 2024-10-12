import { Grid } from "@mantine/core";
import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";

import MachineStateChart from "./components/MachineStateChart/MachineStateChart";
import StretchingColumn from "./components/StretchingColumn/StretchingColumn";
import NetworkDataDisplay from "./components/NetworkDataDisplay/NetworkDataDisplay";
import { clockSynchronizedTimeout } from "../../utils/misc";
import useAuth from "../../hooks/useAuth";
import ConsoleDisplay from "./components/ConsoleDisplay/ConsoleDisplay";
import useFetch from "../../hooks/useFetch";

export default function VirtualMachinePage() {
    const { uuid } = useParams();
    const { authOptions } = useAuth();
    const { data, refresh } = useFetch(`vm/${uuid}/state`, authOptions);
    const currentState = data || {loading: true};

    useEffect(() => {
        const clear = clockSynchronizedTimeout(refresh, 1)
        return () => clear();
    }, []);

    return (
        <Grid display='flex' p='4' pt='0'>
            <StretchingColumn span={6} h='45%'>
                <NetworkDataDisplay uuid={uuid} currentState={currentState} authOptions={authOptions} />
            </StretchingColumn>
            <StretchingColumn span={6} h='45%'>
                <ConsoleDisplay uuid={uuid}/>
            </StretchingColumn>
            <StretchingColumn span={12} h='55%'>
                <MachineStateChart currentState={currentState} />
            </StretchingColumn>
        </Grid >
    )
}
