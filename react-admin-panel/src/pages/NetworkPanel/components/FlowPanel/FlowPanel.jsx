import { Button, NativeSelect } from "@mantine/core";
import { Panel } from "@xyflow/react";
import { useEffect, useState } from "react";
import styles from './FlowPanel.module.css';
import useFetch from "../../../../hooks/useFetch";

export default function FlowPanel({ resetFlow, saveCurrentFlowState, isDirty, authOptions }) {
    const {data: snapshots} = useFetch('/network/snapshot/all', authOptions);
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
                    display={!isDirty ? 'none' : undefined}
                    disabled={!isDirty}
                    className={styles.resetButton}
                    variant='default'
                    color='gray'
                    w={90}
                >
                    Odrzuć
                </Button>
                <Button
                    onClick={saveCurrentFlowState}
                    disabled={!isDirty}
                    className={styles.saveButton}
                    variant='default'
                    miw={90}
                    maw={180}
                >
                    {isDirty ? 'Zastosuj' : 'Zastosowano zmiany!'}
                </Button>
            </Button.Group>
        </Panel>
    );
}
