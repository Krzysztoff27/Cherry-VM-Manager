import { NativeSelect } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useRef, useState } from "react";
import ConfirmationModal from "../ConfirmationModal/ConfirmationModal";
import useApi from "../../../../hooks/useApi";

export default function Select({authOptions, loadSnapshot, loadPreset, forceUpdate}) {
    const {get} = useApi();
    const [snapshotComponents, setSnapshotComponents] = useState([]);
    const [presetComponents, setPresetComponents] = useState([]);
    const selectedValue = useRef(null);
    const [confirmationOpened, { open, close }] = useDisclosure(false);

    useEffect(() => {
        const setData = async () => {
            const snapshots = await get('/network/snapshot/all', authOptions);
            const presets = await get('/network/preset/all', authOptions);
            setSnapshotComponents(snapshots?.map((s, i) => 
                <option key={i} value={`snapshot-${s.id}`}> {s.name}</option>
            ) ?? []);
            setPresetComponents(presets?.map((p, i) => 
                <option key={i} value={`preset-${p.id}`}>&#xf023; &nbsp;{p.name}</option>
            ) ?? []);
        }
        setData();
    }, [authOptions, forceUpdate]);

    const onChange = (event) => {
        if(event.currentTarget.value === 'null') return;
        selectedValue.current = event.currentTarget.value;
        open();
    }

    const onModalCancel = () => {
        close();
    }

    const onModalConfirm = () => {
        const selection = selectedValue.current?.split?.('-');
        if(selection[0] === 'preset') loadPreset(selection[1]);
        else if(selection[0] === 'snapshot') loadSnapshot(selection[1]);

        selectedValue.current = null;
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
                value={`${selectedValue.current}`}
                radius={0}
                w={268}
            >
                <option value='null'>Załaduj migawkę</option>
                <optgroup label='Konfiguracje domyślne'>
                    {...presetComponents}
                </optgroup>
                <optgroup label='Zapisane migawki'>
                    {...snapshotComponents}
                </optgroup>
            </NativeSelect>
        </>
    )
}
