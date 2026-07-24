import { Grid } from "@mantine/core";
import { useParams } from "react-router-dom";
import Column from "../../../../components/atoms/layout/Column/Column";
import LogsDisplay from "../../../../components/molecules/display/LogsDisplay/LogsDisplay";
import MachineStateChart from "../../../../components/molecules/display/MachineStateChart/MachineStateChart";
import MachineEditForm, { MachineEditFormData } from "../../../../components/organisms/forms/MachineEditForm/MachineEditForm";
import MachineDataDisplay from "../../../../components/templates/MachineDataDisplay/MachineDataDisplay";
import useMachineWebSocket from "../../../../hooks/useMachineWebSocket.ts";
import _ from "lodash";
import { useMemo } from "react";
import { MachinePropertiesPayload } from "../../../../types/api.types.ts";

export interface MachinePageProps {}

const MachinePage = (): React.JSX.Element => {
    const { uuid } = useParams();

    const { machines, loading, error } = useMachineWebSocket("subscribed", uuid);
    const machine = uuid && machines ? (machines[uuid] ?? null) : null;

    console.log(machine);

    const machineProperties = useMemo<MachineEditFormData | null>(
        () =>
            machine
                ? {
                      uuid: machine.uuid,
                      title: machine.title,
                      tags: machine.tags,
                      description: machine.description,
                      owner: machine.owner,
                      assigned_clients: machine.assigned_clients,
                      connections: machine.connections,
                      disks: machine.disks,
                      ram_max: machine.ram_max,
                      vcpu: machine.vcpu,
                      state: machine.state,
                      interfaces: machine.interfaces,
                  }
                : null,
        [
            machine?.uuid,
            machine?.title,
            machine?.tags,
            machine?.description,
            machine?.owner,
            machine?.assigned_clients,
            machine?.connections,
            machine?.disks,
            machine?.ram_max,
            machine?.vcpu,
            machine?.state,
        ],
    );

    if (!machine || error) return <></>;

    return (
        <Grid
            display="flex"
            p="md"
        >
            <>
                <Column
                    span={6}
                    h="45%"
                >
                    <MachineDataDisplay machine={machine} />
                </Column>
                <Column
                    span={6}
                    h="45%"
                >
                    <LogsDisplay />
                </Column>
                <Column
                    span={6}
                    h="55%"
                >
                    {<MachineEditForm machine={machineProperties!} />}
                </Column>
                <Column
                    span={6}
                    h="55%"
                >
                    <MachineStateChart machine={machine} />
                </Column>
            </>
        </Grid>
    );
};

export default MachinePage;
