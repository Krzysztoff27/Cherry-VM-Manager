import { NativeSelect } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useRef, useState } from "react";
import ConfirmationModal from "../ConfirmationModal/ConfirmationModal";
import useApi from "../../../../hooks/useApi";
import useAuth from "../../../../hooks/useAuth";

const VALUE_SEPERATOR = ':::';

export default function Select({ loadSnapshot, loadPreset, forceSnapshotDataUpdate }) {
    const { getRequest } = useApi();
    const { authOptions } = useAuth();
    const [snapshotComponents, setSnapshotComponents] = useState([]);
    const [presetComponents, setPresetComponents] = useState([]);
    const [confirmationOpened, { open, close }] = useDisclosure(false);
    const selectedValue = useRef(null);

    const combineValues = (...values) => values.join(VALUE_SEPERATOR);

    const splitValues = (value) => value.split?.(VALUE_SEPERATOR);

    useEffect(() => {
        const setData = async () => {
            const snapshots = await getRequest('/network/snapshot/all', authOptions);
            const presets = await getRequest('/network/preset/all', authOptions);
            setSnapshotComponents(snapshots?.map((s, i) =>
                <option key={i} value={combineValues('snapshot', s.uuid)}> {s.name}</option>
            ) ?? []);
            setPresetComponents(presets?.map((p, i) =>
                <option key={i} value={combineValues('preset', p.uuid)}>&#xf023; &nbsp;{p.name}</option>
            ) ?? []);
        }
        setData();
    }, [authOptions, forceSnapshotDataUpdate]);

    const onChange = (event) => {
        if (event.currentTarget.value === 'null') return;
        selectedValue.current = event.currentTarget.value;
        open();
    }

    const onModalCancel = () => {
        selectedValue.current = null;
        close();
    }

    const onModalConfirm = () => {
        const [type, uuid] = splitValues(selectedValue.current);

        if (type === 'preset') loadPreset(uuid);
        else if (type === 'snapshot') loadSnapshot(uuid);

        selectedValue.current = null;
        close();
    }

    return (
        <>
            <ConfirmationModal
                opened={confirmationOpened}
                onCancel={onModalCancel}
                onConfirm={onModalConfirm}
                title='Confirm loading configuration'
                confirmButtonProps={{ color: 'red.7' }}
            />
            <NativeSelect
                onChange={onChange}
                value={`${selectedValue.current}`}
                radius={0}
                w={268}
            >
                <option value='null'>Load configuration</option>
                <optgroup label='Default Presets'>
                    {...presetComponents}
                </optgroup>
                <optgroup label='Saved Snapshots'>
                    {...snapshotComponents}
                </optgroup>
            </NativeSelect>
        </>
    )
}
