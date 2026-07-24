import { ActionIcon, Group, Loader, MantineSize } from "@mantine/core";
import { IconPlayerPlayFilled, IconPlayerStopFilled } from "@tabler/icons-react";
import React, { useEffect, useState } from "react";
import { MachineState, UserExtended } from "../../../../types/api.types";
import useApi from "../../../../hooks/useApi";
import useFetch from "../../../../hooks/useFetch";
import { usePermissions } from "../../../../contexts/PermissionsContext";
import { isNull } from "lodash";
import { MantineActionIconAllProps } from "../../../../types/mantine.types";
import { useThrottledCallback } from "@mantine/hooks";

export interface MachineControlsProps {
    machine: {
        uuid: string;
        state: MachineState;
    };
    disabled?: boolean;
    size?: MantineSize | number | string;
    gap?: MantineSize | number | string;
    buttonProps?: MantineActionIconAllProps;
}

const MachineControls = ({ machine, size = "lg", gap = "sm", buttonProps, disabled = false }: MachineControlsProps): React.JSX.Element => {
    const { sendRequest } = useApi();
    const { data: user, loading, error } = useFetch<UserExtended>("/users/me");
    const { canManageMachine } = usePermissions();
    const [used, setUsed] = useState(false);

    const startMachine = useThrottledCallback(() => {
        sendRequest("POST", `/machines/start/${machine.uuid}`);
        setUsed(true);
    }, 1000);

    const stopMachine = useThrottledCallback(() => {
        sendRequest("POST", `/machines/stop/${machine.uuid}`);
        setUsed(true);
    }, 1000);

    useEffect(() => setUsed(false), [machine.state]);

    const buttonDisabled =
        used ||
        disabled ||
        loading ||
        isNull(machine) ||
        !isNull(error) ||
        isNull(user) ||
        !canManageMachine(user, machine) ||
        !["ACTIVE", "OFFLINE", "ERROR"].includes(machine.state);

    return (
        <Group
            gap={gap}
            wrap="nowrap"
            onClick={(e) => e.preventDefault()}
        >
            <ActionIcon
                variant="filled"
                size={size}
                color="lime.7"
                {...buttonProps}
                disabled={buttonDisabled || machine.state === "ACTIVE"}
                onClick={startMachine}
            >
                {used ? (
                    <Loader
                        color="orange.6"
                        size={16}
                        type="bars"
                    />
                ) : (
                    <IconPlayerPlayFilled size={"28"} />
                )}
            </ActionIcon>
            <ActionIcon
                variant="filled"
                size={size}
                color="red.7"
                {...buttonProps}
                disabled={buttonDisabled || ["OFFLINE", "ERROR"].includes(machine.state)}
                onClick={stopMachine}
            >
                {used ? (
                    <Loader
                        color="orange.6"
                        size={16}
                        type="bars"
                    />
                ) : (
                    <IconPlayerStopFilled size={"28"} />
                )}
            </ActionIcon>
        </Group>
    );
};

export default MachineControls;
