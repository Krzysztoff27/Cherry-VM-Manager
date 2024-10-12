import { useResizeObserver } from "@mantine/hooks";
import { Button, Card, Collapse, Divider, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconChevronDown, IconChevronRight, IconGripHorizontal } from "@tabler/icons-react";
import classes from './CardGroup.module.css'
import cardClasses from '../MachineCard/MachineCard.module.css'

/**
 * Groups machine cards or similar elements into a collapsible section with a toggle button.
 * The component automatically adjusts the number of columns in the grid layout based on the container width.
 * It displays a button labeled with the group name, which can be used to expand or collapse the group.
 *
 * @param {Object} props - The properties passed to the component.
 * @param {React.ReactNode[]} props.children - The elements (e.g., machine cards) to be displayed inside the collapsible group.
 * @param {string} props.group - The name of the group, displayed on the toggle button and divider.
 * @param {boolean} props.opened - Boolean indicating whether the group is expanded (`true`) or collapsed (`false`).
 * @param {function} props.toggleOpened - A function that toggles the `opened` state, expanding or collapsing the group.
 * 
 * @returns {JSX.Element}
 */
export default function CardGroup({ children, group, opened, toggleOpened }) {
    const [containerRef, rect] = useResizeObserver();
    const numOfCols = Math.max(Math.floor(rect.width / 300), 1);

    const dummyChildren = Array.from({ length: children.length }, (_, i) => 
        <Card key={i} className={cardClasses.card}/>
    )

    return (
        <Stack ref={containerRef} className={classes.groupContainer}>
            <Button
                component={Card}
                onClick={toggleOpened}

                classNames={{ root: classes.button, label: classes.buttonLabel }}
                aria-label={`${opened ? 'Collapse' : 'Expand'} the virtual machine group.`}
                variant='transparent'

                leftSection={opened ? <IconChevronDown className={classes.buttonIcon} /> : <IconChevronRight className={classes.buttonIcon} />}
                rightSection={<IconGripHorizontal className={classes.buttonIcon} />}
            >
                <Divider
                    classNames={{ root: classes.divider, label: classes.dividerLabel }}
                    label={
                        <Text tt='capitalize' className={classes.dividerLabelText}>
                            {group}
                        </Text>
                    }
                />
            </Button>

            <Collapse in={opened} className={classes.collapse}>
                <SimpleGrid cols={numOfCols}>
                    {opened ? children : dummyChildren}
                </SimpleGrid>
            </Collapse>
        </Stack>
    )
}