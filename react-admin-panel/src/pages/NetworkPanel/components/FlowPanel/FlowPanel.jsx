import { Button, List, Stack, Text } from "@mantine/core";
import { Panel } from "@xyflow/react";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from '@tabler/icons-react';
import SnapshotSelect from "../SnapshotSelect/SnapshotSelect";
import ConfirmationModal from "../ConfirmationModal/ConfirmationModal";
import styles from './FlowPanel.module.css';
import TextInputModal from "../TextInputModal/TextInputModal";
import { useState } from "react";
import { notifications } from "@mantine/notifications";

export default function FlowPanel({ resetFlow, applyNetworkConfig, isDirty, snapshotSelectProps, postSnapshot, takeSnapshot }) {
    const [confirmationOpened, confirmation] = useDisclosure(false);
    const [textInputOpened, textInput] = useDisclosure(false);
    const [forceUpdate, setForceUpdate] = useState(0)

    const onRestoreButtonClick = () => confirmation.open();
    const onRestoreModalCancel = () => confirmation.close();
    const onRestoreModalConfirm = () => {
        confirmation.close();
        resetFlow()
        .then(() => notifications.show({
            id: 'flow-reset',
            color: 'suse-green',
            title: 'Przywrócono konfigurację sieciową',
            message: `Pomyślnie przywrócono obecny stan konfiguracji sieciowej maszyn.`
        }))
    }

    const onAddSnapshotButtonClick = () => textInput.open();
    const onAddSnapshotModalCancel = () => textInput.close();
    const onAddSnapshotModalConfirm = async (name) => {
        textInput.close();

        const response = await postSnapshot({name: name, data: takeSnapshot()});
        setForceUpdate(val => ++val);

        if(response) notifications.show({
            id: 'snapshot-create',
            color: 'suse-green',
            title: `Utworzono nową migawkę - "${name}"`,
            message: `Pomyślnie zapisano obecną konfigurację sieciową do migawki "${name}"`
        })
    }

    return (
        <>
            <TextInputModal
                opened={textInputOpened}
                onCancel={onAddSnapshotModalCancel}
                onConfirm={onAddSnapshotModalConfirm}
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
                    placeholder:"Wpisz nazwę migawki",
                    description:"Uwaga - nazwa migawki nie podlega zmianie"
                }}
            />
            <ConfirmationModal 
                opened={confirmationOpened} 
                onCancel={onRestoreModalCancel}
                onConfirm={onRestoreModalConfirm}
                title='Potwierdzenie operacji'
                message='Wykonanie tej operacji odrzuci wszystkie dotychczasowe zmiany i przywróci obecnie działającą konfigurację. Czy napewno chcesz kontynuować?'
                confirmButtonProps={{color: 'red.7'}}
            />
            <Panel position="top-center">
                <Button.Group>
                    <Button
                        onClick={onAddSnapshotButtonClick}
                        variant='default'
                        size='sm'
                        pl='xs'
                        pr='9'
                    >
                        <IconPlus size={20}/>
                    </Button>
                    <SnapshotSelect {...snapshotSelectProps} forceUpdate={forceUpdate}/>
                    <Button
                        onClick={onRestoreButtonClick}
                        display={!isDirty ? 'none' : undefined}
                        disabled={!isDirty}
                        className={styles.resetButton}
                        variant='default'
                        w={100}
                    >
                        Odrzuć
                    </Button>
                    <Button
                        onClick={applyNetworkConfig}
                        disabled={!isDirty}
                        classNames={{
                            root: isDirty === null ? null : styles.saveButton,
                            label: styles.saveButtonLabel
                        }}
                        variant='default'
                        w={isDirty ? 100 : 200}
                        p={0}
                    >
                        {isDirty === null ? 'Brak wykrytych zmian' : isDirty ? 'Zapisz' : 'Zapisano zmiany!'}
                    </Button>
                </Button.Group>
            </Panel>
        </>
    );
}
