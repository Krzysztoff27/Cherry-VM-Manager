import { NativeSelect } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState } from "react";
import ConfirmationModal from "../ConfirmationModal/ConfirmationModal";
import useApi from "../../../../hooks/useApi";

export default function SnapshotSelect({authOptions, loadSnapshot, forceUpdate}) {
    const {get} = useApi();
    const [snapshotSelectData, setSnapshotSelectData] = useState({ defaultSnapshots: [], userSnapshots: [] });
    const [value, setValue] = useState(-1);
    const [confirmationOpened, { open, close }] = useDisclosure(false);

    useEffect(() => {
        const setData = async () => {
            const snapshots = await get('/network/snapshot/all', authOptions);
            const data =  snapshots?.reduce(
                (acc, snapshot) => {
                    if (snapshot.deletable) acc.userSnapshots.push(<option value={snapshot.id}> {snapshot.name}</option>);
                    else acc.defaultSnapshots.push(<option value={snapshot.id}>&#xf023; &nbsp;{snapshot.name}</option>);
                    return acc;
                }, { defaultSnapshots: [], userSnapshots: [] }
            );
            setSnapshotSelectData(data);
        }
        setData();
    }, [authOptions, forceUpdate]);

    const onChange = (event) => {
        if(event.currentTarget.value === -1) return;
        setValue(event.currentTarget.value);
        open();
    }

    const onModalCancel = () => {
        setValue(-1);
        close();
    }

    const onModalConfirm = () => {
        setValue(id => {
            loadSnapshot(id);
            return -1;
        })
        close();
    }

    return (
        <>
            <ConfirmationModal 
                opened={confirmationOpened} 
                onCancel={onModalCancel}
                onConfirm={onModalConfirm}
                title='Potwierdzenie operacji' 
                confirmButtonProps={{color: 'red.7'}}
            />
            <NativeSelect
                onChange={onChange}
                value={value}
                radius={0}
                w={268}
            >
                <option value='-1'>Załaduj migawkę</option>
                <optgroup label='Domyślne konfiguracje'>
                    {...(snapshotSelectData?.defaultSnapshots ?? [])}
                </optgroup>
                <optgroup label='Zapisane migawki'>
                    {...(snapshotSelectData?.userSnapshots ?? [])}
                </optgroup>
            </NativeSelect>
        </>
    )
}
