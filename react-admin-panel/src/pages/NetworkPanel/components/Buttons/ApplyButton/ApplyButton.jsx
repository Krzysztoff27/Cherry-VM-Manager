import { Button } from "@mantine/core";
import styles from './ApplyButton.module.css';

export default function ApplyButton({applyNetworkConfig = () => {}, isDirty}) {
    return (
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
            {isDirty === null ? 'No changes detected' : isDirty ? 'Save' : 'Changes saved!'}
        </Button>
    )
}
