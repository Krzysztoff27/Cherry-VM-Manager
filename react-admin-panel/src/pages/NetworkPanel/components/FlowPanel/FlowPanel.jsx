import { Button } from "@mantine/core";
import { Panel } from "@xyflow/react";
import Select from "../Select/Select";
import RestoreButton from "../Buttons/RestoreButton/RestoreButton";
import ApplyButton from "../Buttons/ApplyButton/ApplyButton";
import AddSnapshotButton from "../Buttons/AddSnapshotButton/AddSnapshotButton";
import ModifySnapshotsButton from "../Buttons/ModifySnapshotsButton/ModifySnapshotsButton";
import { useToggle } from "@mantine/hooks";
import RefreshMachinesButton from "../Buttons/RefreshMachinesButton/RefreshMachinesButton";

export default function FlowPanel({ resetFlow, applyNetworkConfig, isDirty, loadSnapshot, loadPreset, refreshMachines, postSnapshot }) {
    const [forceSnapshotDataUpdate, initiateSnapshotDataUpdate] = useToggle([false, true]);

    return (
        <>
            <Panel position="top-center">
                <Button.Group>
                    <AddSnapshotButton
                        postSnapshot={postSnapshot}
                        initiateSnapshotDataUpdate={initiateSnapshotDataUpdate}
                    />
                    <ModifySnapshotsButton
                        forceSnapshotDataUpdate={forceSnapshotDataUpdate}
                        initiateSnapshotDataUpdate={initiateSnapshotDataUpdate}
                    />
                    <Select
                        loadSnapshot={loadSnapshot}
                        loadPreset={loadPreset}
                        forceSnapshotDataUpdate={forceSnapshotDataUpdate}
                    />
                    <RestoreButton
                        resetFlow={resetFlow}
                        isDirty={isDirty}
                    />
                    <ApplyButton
                        applyNetworkConfig={applyNetworkConfig}
                        isDirty={isDirty}
                    />
                    <RefreshMachinesButton
                        refreshMachines={refreshMachines}
                        isDirty={isDirty}
                    />
                </Button.Group>
            </Panel>
        </>
    );
}
