import { ActionIcon, Button, Group, Modal, rem, ScrollArea, Stack, Text, TextInput } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertCircle, IconAlertCircleFilled, IconArrowBackUp, IconDeviceDesktop, IconEdit, IconTopologyStarRing3, IconTrash } from '@tabler/icons-react';
import useFetch from '../../../../../../../../Webapp/react-admin-panel/src/hooks/useFetch';
import useAuth from '../../../../../../../../Webapp/react-admin-panel/src/hooks/useAuth';
import useErrorHandler from '../../../../../../../../Webapp/react-admin-panel/src/hooks/useErrorHandler';
import { safeObjectValues } from '../../../../../../../../Webapp/react-admin-panel/src/utils/misc';
import { useForm } from '@mantine/form';
import classes from './ModifySnapshotButton.module.css';
import { useState } from 'react';
import { startsWithLetter, isInRange } from '../../../../../utils/misc.js';

export default function ModifySnapshotsButton() {
    const [opened, { open, close }] = useDisclosure();

    return (
        <>
            <SnapshotModificationModal opened={opened} onClose={close} />
            <Button
                onClick={open}
                variant='default'
                size='sm'
                pl='xs'
                pr='9'
                aria-label='Enter snapshot modification modal'
            >
                <IconEdit size={20} />
            </Button>
        </>
    )
}

function SnapshotModificationModal({ opened, onClose }) {
    const { authOptions } = useAuth();
    const { requestResponseError } = useErrorHandler();
    const { data, error, loading } = useFetch('network/snapshot/all', authOptions);

    if (error) {
        requestResponseError(error);
        return;
    };

    if (loading) return;

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            scrollAreaComponent={ScrollArea.Autosize}
            styles={{ title: { fontSize: rem(24), padding: rem(10) } }}
            size='lg'
            title='Modify and delete snapshots'
        >
            <ModificationForm snapshots={data} />
        </Modal>
    )
}

function ModificationForm({ snapshots }) {
    const onlyValidCharacters = (str) => /^[\w\-\ ]*$/.test(str);
    const validationMethod = (val) => (
        !isInRange(val.length, 3, 16) ? 'Snapshot name must be between 3 and 16 characters.' :
            !startsWithLetter(val) ? 'Snapshot name must start with a letter.' :
                !onlyValidCharacters(val) ? 'Snapshot name can only include alphanumeric characters, spaces, underscores and hyphens.' : null
    );

    const createUuidKeyedObject = (valueFunction) => snapshots.reduce((acc, snapshot) => ({ ...acc, [snapshot.uuid]: valueFunction(snapshot) }), {});

    const getFormValidation = () => createUuidKeyedObject(_ => validationMethod);
    const getInitialValues = () => createUuidKeyedObject(snapshot => snapshot.name);

    const [deleted, setDeleted] = useState({});
    const form = useForm({
        initialValues: getInitialValues(),
        validate: getFormValidation(),
        validateInputOnChange: true,
    })

    const onDeleteButtonClick = (uuid) => setDeleted(prev => {
        let newDeleted = { ...prev };
        prev[uuid] ? delete newDeleted[uuid] : newDeleted[uuid] = true;
        return newDeleted;
    });

    const deletedLength = safeObjectValues(deleted).length;

    const onFormSubmit = form.onSubmit((values) => console.log(values));
    const onFormReset = () => {
        form.reset();
        setDeleted({});
    }

    return (
        <form onSubmit={onFormSubmit} onReset={onFormReset}>
            <Stack>{
                snapshots.map((snapshot, i) => (
                    <ModificationFormLine
                        key={i}
                        snapshot={snapshot}
                        inputProps={form.getInputProps(`${snapshot.uuid}`)}
                        isDeleted={deleted[snapshot.uuid]}
                        onDeleteButtonClick={() => onDeleteButtonClick(snapshot.uuid)}
                    />
                ))
            }
            </Stack>
            <Group justify="space-between" mt="md" wrap='nowrap'>
                <Button type='reset' variant='default'>Reset</Button>{
                    deletedLength ?
                    <Group gap='6' wrap='nowrap'>
                        <IconAlertCircleFilled color='var(--mantine-color-red-6)' size={20}/>
                        <Text c='red.6' fw={500}>{deletedLength} snapshot{deletedLength > 1 ? 's' : ''} will be pernamently deleted!</Text>
                    </Group> : null
                }
                <Button type="submit" color='red.9'>Submit</Button>
            </Group>
        </form>
    );
}

function ModificationFormLine({ snapshot, inputProps, isDeleted, onDeleteButtonClick }) {
    return (
        <Group gap='xs' align='top'>
            <ActionIcon
                size='lg'
                color='red.7'
                variant={isDeleted ? 'transparent' : 'light'}
                aria-label='Delete snapshot'
                onClick={() => onDeleteButtonClick(snapshot.uuid)}
            >
                {isDeleted ? <IconArrowBackUp size={20} /> : <IconTrash size={20} />}
            </ActionIcon>
            <TextInput
                classNames={{ input: classes.lineTextInput }}
                flex='1'
                variant='filled'
                placeholder='Enter new snapshot name'
                disabled={isDeleted}
                {...inputProps}
            />
            <Group gap='xs' h='fit-content'>
                <Group className={`${classes.lineStats} ${isDeleted ? classes.disabled : ''}`} justify='right' gap='xs'>
                    <Text>{snapshot.nodes.filter(node => node.type === 'machine').length}</Text>
                    <IconDeviceDesktop />
                </Group>
                <Group className={`${classes.lineStats} ${isDeleted ? classes.disabled : ''}`} justify='right' gap='xs'>
                    <Text>{safeObjectValues(snapshot.intnets).length}</Text>
                    <IconTopologyStarRing3 />
                </Group>
            </Group>
        </Group>
    )
}