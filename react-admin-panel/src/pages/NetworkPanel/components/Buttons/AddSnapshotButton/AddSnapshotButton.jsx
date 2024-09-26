import { useDisclosure } from "@mantine/hooks";
import { IconCameraPlus } from "@tabler/icons-react";
import TextInputModal from "../../TextInputModal/TextInputModal";
import { notifications } from "@mantine/notifications";
import { Button, List, Stack, Text } from "@mantine/core";

export default function AddSnapshotButton({ postSnapshot = async () => { }, setForceUpdate = () => { } }) {
    const [opened, { open, close }] = useDisclosure();

    const onClick = () => open();
    const onCancel = () => close();
    const onConfirm = async (name) => {
        const response = await postSnapshot(name);

        if (!response) return;
        close();
        setForceUpdate(val => ++val);
        notifications.show({
            id: 'snapshot-create',
            color: 'suse-green',
            title: `New snapshot created - "${name}"`,
            message: `Current configuration was successfuly saved to the snapshot "${name}"`
        })
    }

    return (
        <>
            <TextInputModal
                opened={opened}
                onCancel={onCancel}
                onConfirm={onConfirm}
                title='New snapshot'
                content={
                    <Stack gap='xs'>
                        <Text size='sm'>The snapshot will save the current state of the panel:</Text>
                        <List size='sm'>
                            <List.Item>Current connections and internal networks</List.Item>
                            <List.Item>Position of machines in the flow</List.Item>
                            <List.Item>Position of internal networks in the flow</List.Item>
                        </List>
                    </Stack>
                }
                textInputProps={{
                    withAsterisk: true,
                    placeholder: 'Enter the snapshot\'s name',
                    description: 'Note: The name cannot be changed.'
                }}
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
