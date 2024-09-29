import { Button, List, Loader, Modal, Stack, Text, TextInput } from "@mantine/core";
import { useField } from '@mantine/form';
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconCameraPlus } from "@tabler/icons-react";
import useErrorHandler from "../../../../../hooks/useErrorHandler";
import { useState } from "react";

export default function AddSnapshotButton({ postSnapshot, initiateSnapshotDataUpdate }) {
    const [opened, { open, close }] = useDisclosure();

    const onClick = () => open();

    return (
        <>
            <AddSnapshotModal
                opened={opened}
                close={close}
                postSnapshot={postSnapshot}
                initiateSnapshotDataUpdate={initiateSnapshotDataUpdate}
            />
            <Button
                onClick={onClick}
                variant='default'
                size='sm'
                pl='xs'
                pr='9'
            >
                <IconCameraPlus size={20} />
            </Button>
        </>
    )
}

function AddSnapshotModal({ opened, close, postSnapshot, initiateSnapshotDataUpdate }) {
    const { requestResponseError } = useErrorHandler();
    const [loading, setLoading] = useState(false);
    
    const field = useField({
        initialValue: '',
        validate: (value) => {
            if (!value || value?.length < 3) return 'Snapshot name must be at least 3 characters long.';
            if (value.length > 24) return 'Snapshot name must not be longer than 24 characters.';
            if (!(/^[!-z]{3,32}$/.test(value))) return (
                <Stack gap='0'>
                    <Text fz='xs'>Snapshot names can only include letters, digits and following special characters:</Text>
                    <Text fz='xs'>{`! " # $ % & ' ( ) * + , - . / : ; < = > ? @ [ ] \ ^ _ \``}</Text>
                </Stack>
            )
            return;
        }
    })

    const onConfirm = async () => {
        setLoading(true)
        await field.validate().then(async (invalid) => {
            if (invalid) return;
            const name = field.getValue();

            const errorCallback = (res, body) => res?.status === 409 ? field.setError('Snapshot with this name already exists.') : requestResponseError(res, body);
            const response = await postSnapshot(name, errorCallback);
            if (!response) return;

            onCancel();
            initiateSnapshotDataUpdate();
            notifications.show({
                id: `snapshot-create-${name}`,
                color: 'suse-green',
                title: `New snapshot created - "${name}"`,
                message: `Current configuration was successfuly saved to the snapshot "${name}"`
            })
        })
        setLoading(false);
    }

    const onCancel = () => {
        close();
        field.reset();
        setLoading(false);
    }

    return (
        <Modal
            opened={opened}
            onClose={onCancel}
            title='New snapshot'
        >
            <Stack>
                <Stack gap='xs'>
                    <Text size='sm'>The snapshot will save the current state of the panel:</Text>
                    <List size='sm'>
                        <List.Item>Current connections and internal networks</List.Item>
                        <List.Item>Position of machines in the flow</List.Item>
                        <List.Item>Position of internal networks in the flow</List.Item>
                    </List>
                </Stack>
                <TextInput
                    withAsterisk={true}
                    placeholder="Enter the snapshot's name"
                    description="Note: Snapshot name must be unique"
                    rightSection={loading ? <Loader size={18} /> : null}
                    {...field.getInputProps()}
                />
                <Button
                    type='submit'
                    variant='light'
                    radius='sm'
                    data-autofocus
                    onClick={onConfirm}
                >
                    Confirm
                </Button>
            </Stack>
        </Modal>
    )
}
