import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import TextInputModal from "../../TextInputModal/TextInputModal";
import { notifications } from "@mantine/notifications";
import { Button, List, Stack, Text } from "@mantine/core";

export default function AddSnapshotButton({postSnapshot = async () => {}, setForceUpdate = () => {}}) {
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
            title: `Utworzono nową migawkę - "${name}"`,
            message: `Pomyślnie zapisano obecną konfigurację sieciową do migawki "${name}"`
        })
    }

    return (
        <>
            <TextInputModal
                opened={opened}
                onCancel={onCancel}
                onConfirm={onConfirm}
                title='Tworzenie migawki'
                content={
                    <Stack gap='xs'>
                        <Text size='sm'>W migawce zostanie zapisany obecny stan panelu:</Text>
                        <List size='sm'>
                            <List.Item>Obecne połączenia i sieci wewnętrzne</List.Item>
                            <List.Item>Położenie maszyn na planszy</List.Item>
                            <List.Item>Położenie sieci wewnętrznych na planszy</List.Item>
                        </List>
                    </Stack>
                }
                textInputProps={{
                    withAsterisk: true,
                    placeholder: "Wpisz nazwę migawki",
                    description: "Uwaga - nazwa migawki nie podlega zmianie"
                }}
            />
            <Button
                onClick={onClick}
                variant='default'
                size='sm'
                pl='xs'
                pr='9'
            >
                <IconPlus size={20} />
            </Button>
        </>
    )
}
