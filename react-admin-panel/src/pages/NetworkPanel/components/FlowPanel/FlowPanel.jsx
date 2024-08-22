import { Button } from "@mantine/core";
import { Panel } from "@xyflow/react";
import { useState } from "react";
import Select from "../Select/Select";
import RestoreButton from "../Buttons/RestoreButton/RestoreButton";
import ApplyButton from "../Buttons/ApplyButton/ApplyButton";
import AddSnapshotButton from "../Buttons/AddSnapshotButton/AddSnapshotButton";
import RunPresetButton from "../Buttons/RunPresetButton/RunPresetButton"

export default function FlowPanel({ resetFlow, applyNetworkConfig, isDirty, selectProps,addSnapshotButtonProps }) {
    const [forceUpdate, setForceUpdate] = useState(0)

    return (
        <>
            <Panel position="top-center">
                <Button.Group>
                    <AddSnapshotButton {...addSnapshotButtonProps} setForceUpdate={setForceUpdate}/>
                    <Select {...selectProps} forceUpdate={forceUpdate}/>
                    <RestoreButton resetFlow={resetFlow} isDirty={isDirty}/>
                    <ApplyButton applyNetworkConfig={applyNetworkConfig} isDirty={isDirty}/>
                </Button.Group>
            </Panel>
        </>
    );
}
