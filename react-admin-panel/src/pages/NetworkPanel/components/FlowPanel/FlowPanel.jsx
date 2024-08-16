import { Button, NativeSelect } from "@mantine/core";
import { Panel } from "@xyflow/react";
import { useEffect, useState } from "react";
import styles from './FlowPanel.module.css';

export default function FlowPanel({ resetFlow, saveCurrentFlowState, unsavedChanges, authFetch }) {
    const {data: snapshots} = authFetch('/network/snapshot/all');
    const [snapshotSelectData, setSnapshotSelectData] = useState({defaultSnapshots: [], userSnapshots: []});

    useEffect(() => {
            const data = snapshots?.reduce(
                (acc, snapshot) => {
                    if(snapshot.deletable) acc.userSnapshots.push(<option value={snapshot.id}> {snapshot.name}</option>);
                    else acc.defaultSnapshots.push(<option value={snapshot.id}>&#xf023; &nbsp;{snapshot.name}</option>);
                    return acc;
                }, {defaultSnapshots: [], userSnapshots: []}
            );
            setSnapshotSelectData(data)
        }, [snapshots],
    );
    
    return (
        <Panel position="top-center">
            <Button.Group>
                <NativeSelect
                    radius={0}
                    w={268}
                >
                    <option>Załaduj migawkę</option>
                    <optgroup label='Domyślne konfiguracje'>
                        {...(snapshotSelectData?.defaultSnapshots ?? [])}
                    </optgroup>
                    <optgroup label='Zapisane migawki'>
                        {...(snapshotSelectData?.userSnapshots ?? [])}
                    </optgroup>
                </NativeSelect>
                <Button
                    onClick={() => resetFlow(false)}
                    display={!unsavedChanges ? 'none' : undefined}
                    disabled={!unsavedChanges}
                    className={styles.resetButton}
                    variant='default'
                    color='gray'
                    w={90}
                >
                    Odrzuć
                </Button>
                <Button
                    onClick={saveCurrentFlowState}
                    disabled={!unsavedChanges}
                    className={styles.saveButton}
                    variant='default'
                    miw={90}
                    maw={180}
                >
                    {unsavedChanges ? 'Zastosuj' : 'Zastosowano zmiany!'}
                </Button>
            </Button.Group>

        </Panel>
    );
}
