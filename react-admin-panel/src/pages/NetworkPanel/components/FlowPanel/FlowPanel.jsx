import { Button } from "@mantine/core";
import { Panel } from "@xyflow/react";
import Select from "../Select/Select";
import RestoreButton from "../Buttons/RestoreButton/RestoreButton";
import ApplyButton from "../Buttons/ApplyButton/ApplyButton";
import AddSnapshotButton from "../Buttons/AddSnapshotButton/AddSnapshotButton";
import ModifySnapshotsButton from "../Buttons/ModifySnapshotsButton/ModifySnapshotsButton";
import { useToggle } from "@mantine/hooks";

export default function FlowPanel({ resetFlow, applyNetworkConfig, isDirty, selectProps, addSnapshotButtonProps }) {
    const [forceSnapshotDataUpdate, initiateSnapshotDataUpdate] = useToggle([false, true]);

    return (
        <>
            <Panel position="top-center">
                <Button.Group>
                    <AddSnapshotButton {...addSnapshotButtonProps} initiateSnapshotDataUpdate={initiateSnapshotDataUpdate} />
                    <ModifySnapshotsButton forceSnapshotDataUpdate={forceSnapshotDataUpdate} initiateSnapshotDataUpdate={initiateSnapshotDataUpdate} />
                    <Select {...selectProps} forceSnapshotDataUpdate={forceSnapshotDataUpdate} />
                    <RestoreButton resetFlow={resetFlow} isDirty={isDirty} />
                    <ApplyButton applyNetworkConfig={applyNetworkConfig} isDirty={isDirty} />
                </Button.Group>
            </Panel>
        </>
    );
}
