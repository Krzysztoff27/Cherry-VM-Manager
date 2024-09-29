import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionIcon, Button, Group, Modal, rem, ScrollArea, Stack, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure, useDebouncedValue } from '@mantine/hooks';
import { IconAlertCircleFilled, IconArrowBackUp, IconCameraPlus, IconDeviceDesktop, IconEdit, IconTopologyStarRing3, IconTrash } from '@tabler/icons-react';
import classes from './ModifySnapshotButton.module.css';
import { hasMultipleOccurrences, isInRange, pluralize, safeObjectValues } from '../../../../../utils/misc.js';
import useApi from '../../../../../hooks/useApi.jsx';
import useAuth from '../../../../../hooks/useAuth.jsx';
import { notifications } from '@mantine/notifications';

/**
 * Button linked to the snapshot modification modal
 * @param {Object} props
 * @param {boolean} props.forceSnapshotDataUpdate - used as a toggle for updating snapshot data when needed
 * @param {function} props.initiateSnapshotDataUpdate - updates snapshot list's across various parent components
 * @returns {React.JSX.Element}
 */
export default function ModifySnapshotsButton({ forceSnapshotDataUpdate, initiateSnapshotDataUpdate }) {
    const [opened, { open, close }] = useDisclosure();

    return (
        <>
            <SnapshotModificationModal
                opened={opened}
                onClose={close}
                close={close}
                forceSnapshotDataUpdate={forceSnapshotDataUpdate}
                initiateSnapshotDataUpdate={initiateSnapshotDataUpdate}
            />
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

/**
 * The modal responsible for modification of snapshots.
 * @param {Object} props
 * @param {boolean} props.opened - is modal opened?
 * @param {function} props.onClose - function called when user clicks outside the modal or on the close modal button
 * @param {function} props.close - closes modal
 * @param {boolean} props.forceSnapshotDataUpdate - used as a toggle for updating snapshot data when needed
 * @param {function} props.initiateSnapshotDataUpdate - updates snapshot list's across various parent components
 * @returns {React.JSX.Element}
 */
function SnapshotModificationModal({ opened, onClose, close, initiateSnapshotDataUpdate, forceSnapshotDataUpdate }) {
    const { authOptions } = useAuth();
    const { getRequest } = useApi();
    const [snapshots, setSnapshots] = useState([]);
    // prevents the modal changing to the "no snapshots to edit" state during fade out transitions (in cases where all snapshots get deleted):
    const [debouncedLength] = useDebouncedValue(snapshots.length, 100); 

    useEffect(() => {
        const getSnapshots = async () => {
            await setSnapshots(await getRequest('network/snapshot/all', authOptions));
        } 
        getSnapshots();
    }, [opened, forceSnapshotDataUpdate]) // refresh every time the modal is opened

    return (
        <>{
            debouncedLength ? (
                <Modal
                    opened={opened}
                    onClose={onClose}
                    styles={{ title: { fontSize: rem(24), padding: rem(4), paddingLeft: 0 } }}
                    size='lg'
                    title='Modify and delete snapshots'
                >
                    <ModificationForm snapshots={snapshots} close={close} initiateSnapshotDataUpdate={initiateSnapshotDataUpdate} />
                </Modal>
            ) : (
                <Modal
                    opened={opened}
                    onClose={onClose}
                    withCloseButton={false}
                    size='sm'
                >
                    <Stack gap='lg'>
                        <Stack gap='8' pt='xs'>
                            <Text size='lg' fw={600}>No snapshots available to edit</Text>
                            <Text size='sm' style={{textWrap: ''}}>
                                To get started, create a new snapshot by clicking the <IconCameraPlus size='20' style={{transform: 'translate(0, 5px)'}}/> button in the panel!
                            </Text>
                        </Stack>
                        <Button onClick={onClose} size='sm' variant='light' fullWidth>Close</Button>
                    </Stack>
                </Modal>
            )
        }</>
    )
}

/**
 * The body of the modification modal.
 * @param {Object} props
 * @param {Array} props.snapshots - array of snapshots
 * @param {function} props.close - closes modal
 * @param {function} props.initiateSnapshotDataUpdate - updates snapshot list's across various parent components
 * @returns {React.JSX.Element}
 */
function ModificationForm({ snapshots, close, initiateSnapshotDataUpdate }) {
    const { authOptions } = useAuth();
    const { postRequest, deleteRequest } = useApi();
    /**
     * Set holding uuids of snapshots as keys with truthy values if they're to be deleted.
     * If snapshot is no longer to be deleted, the property should be deleted from the object.
     * Code prevents deletion of snapshots that exist in this object and have falsy values, but it's considered bad practice.
     */
    const [toBeDeleted, setToBeDeleted] = useState({});
    const toBeDeletedRef = useRef();
    toBeDeletedRef.current = toBeDeleted;

    // snapshot name validators
    const onlyValidCharacters = (str) => /^[!-z]*$/.test(str);
    /**
     * method called by the form for each text input during validation
     * @param {string} val value of current text input
     * @param {Object} data object of values of all text inputs
     * @param {string} path key of the current text input (uuid)
     * @returns 
     */
    const validationMethod = (val, data, path) => {
        if(toBeDeletedRef.current[path]) return;
        const nonDeletedInputs = Object.entries(data).filter((([uuid, _]) => !toBeDeletedRef.current[uuid])).map(([_, input]) => input);

        if(hasMultipleOccurrences(val, nonDeletedInputs)) return 'Snapshot name must be unique';
        if(!isInRange(val?.length || 0, 3, 24)) return 'Snapshot name must be between 3 and 24 characters.';
        if(!onlyValidCharacters(val)) return (
                <Stack gap='0'>
                    <Text fz='xs'>Snapshot names can only include letters, digits and following special characters:</Text>
                    <Text fz='xs'>{`! " # $ % & ' ( ) * + , - . / : ; < = > ? @ [ ] \ ^ _ \``}</Text>
                </Stack>
            )
    }

    /**
     * Reduces an array into object with snapshot UUIDs as keys and values based on the callback function.
     * @param {function} callbackFunction function used to determine the values, executed for every snapshot (as their first parameter).
     * @returns {Object} Object where key is snapshot UUID and value is based on the callback function return value for particular snapshot.
     */
    const createUuidKeyedObject = (callbackFunction) => snapshots.reduce((acc, snapshot) => ({ ...acc, [snapshot.uuid]: callbackFunction(snapshot) }), {});

    const getFormValidation = useCallback(() => createUuidKeyedObject(_ => validationMethod), [snapshots]);
    const getInitialValues = useCallback(() => createUuidKeyedObject(snapshot => snapshot.name), [snapshots]);

    // mantine form holding values of the snapshot name inputs 
    const renamingForm = useForm({
        mode: 'controlled',
        validate: getFormValidation(), // text input validation
        initialValues: getInitialValues(), // default text input values
        clearInputErrorOnChange: false, // prevents "glitching" with the useEffect responsible for validation
    })

    // reset initial values and form on snapshot data change
    useEffect(() => {
        renamingForm.setInitialValues(getInitialValues());
        renamingForm.reset();
    }, [snapshots])

    // update validation for all text inputs on user action
    useEffect(() => {
        renamingForm.validate();
    }, [toBeDeleted, renamingForm.values])

    const onDeleteButtonClick = (uuid) => {
        setToBeDeleted(prev => {
            let newDeleted = { ...prev };
            prev[uuid] ? delete newDeleted[uuid] : newDeleted[uuid] = true;
            return newDeleted;
        });
    }

    const deletedLength = safeObjectValues(toBeDeleted).length;

    /**
     * Function to send requests resulting in renaming snapshots to new values.
     * @param {Object} names values from the submited renamingForm
     */
    const renameSnapshots = async (values) => {
        const initialValues = getInitialValues();
        const toBeRenamed = Object.entries(values).filter(([uuid, name]) => initialValues[uuid] !== name && !toBeDeletedRef.current[uuid]);
        if(!toBeRenamed.length) return;

        toBeRenamed.forEach(([uuid, name]) => postRequest(`network/snapshot/${uuid}/rename/${name}`, undefined, authOptions));
        notifications.show({
            id: `snapshot-rename-${Date.now()}`,
            color: 'suse-green',
            title: `Snapshot renaming complete`,
            message: `Successfully renamed ${toBeRenamed.length} ${pluralize('snapshot', toBeRenamed.length)}.`
        })

        renamingForm.reset();
    }

    /**
     * Function to send DELETE requests resulting in removal of snapshots from the toBeDeleted stateful object.
     */
    const deleteSnapshots = async () => {
        const uuids = Object.entries(toBeDeletedRef.current).filter(([_, val]) => val).map(([uuid, _]) => uuid);
        if(!uuids.length) return;

        uuids.forEach(uuid => deleteRequest(`network/snapshot/${uuid}`, authOptions));
        notifications.show({
            id: `snapshot-removal-${Date.now()}`,
            color: 'suse-green',
            title: `Snapshot removal complete`,
            message: `Successfully removed ${uuids.length} ${pluralize('snapshot', uuids.length)}.`
        })

        setToBeDeleted({});
    }

    /**
     * Function called when user clicks the submit button.
     */
    const onFormSubmit = renamingForm.onSubmit(
        async (values) => {
            close();
            await renameSnapshots(values);
            await deleteSnapshots();
            setTimeout(initiateSnapshotDataUpdate, 200);
        },
        (errors) => {
            const firstErrorPath = Object.keys(errors)[0];
            renamingForm.getInputNode(firstErrorPath)?.focus();
        }
    );

    /**
     * Function called when user clicks the reset button.
     */
    const onFormReset = () => {
        renamingForm.reset();
        setToBeDeleted({});
    }

    return (
        <form onSubmit={onFormSubmit} onReset={onFormReset}>
            <ScrollArea.Autosize mah='60vh' type="always" offsetScrollbars>
                <Stack>{
                    snapshots.map((snapshot, i) => (
                        <ModificationFormLine
                            key={i}
                            snapshot={snapshot}
                            inputProps={renamingForm.getInputProps(`${snapshot.uuid}`)}
                            isDeleted={toBeDeleted[snapshot.uuid]}
                            onDeleteButtonClick={() => onDeleteButtonClick(snapshot.uuid)}
                        />
                    ))
                }
                </Stack>
            </ScrollArea.Autosize>
            <Group justify="space-between" mt="md" wrap='nowrap'>
                <Button type='reset' variant='default'>Reset</Button>{
                    deletedLength ?
                        <Group gap='6' wrap='nowrap'>
                            <IconAlertCircleFilled color='var(--mantine-color-red-6)' size={20} />
                            <Text c='red.6' fw={500}>{deletedLength} snapshot{deletedLength > 1 ? 's' : ''} will be pernamently deleted!</Text>
                        </Group> : null
                }
                <Button type="submit" color='red.9'>Submit</Button>
            </Group>
        </form>
    );
}

/**
 * This component is a singular line in the modification modal's form.
 * @param {Object} props
 * @param {Object} props.snapshot - snapshot that the line represents
 * @param {Object} props.inputProps - form props passed to the TextInput component
 * @param {boolean} props.isDeleted - is in the toBeDeleted object?
 * @param {function} props.onDeleteButtonClick - passed to the deleteButton's onClick prop
 * @returns {React.JSX.Element}
 */
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
                    <Text>{snapshot?.nodes?.filter?.(node => node.type === 'machine')?.length || 0}</Text>
                    <IconDeviceDesktop />
                </Group>
                <Group className={`${classes.lineStats} ${isDeleted ? classes.disabled : ''}`} justify='right' gap='xs'>
                    <Text>{safeObjectValues(snapshot.intnets).length || 0}</Text>
                    <IconTopologyStarRing3 />
                </Group>
            </Group>
        </Group>
    )
}