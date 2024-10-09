import { Button, Divider, Group, Paper, Select } from "@mantine/core";
import { IconArrowsSort, IconDeviceDesktopPlus, IconDevicesPlus, IconRefresh } from "@tabler/icons-react";
import classes from './MachineListPanel.module.css';

export default function MachineListPanel() {
    return (
        <Paper bg='dark.6' radius={0}>
            <Group
                justify='space-between'
                pl='md'
                pr='md'
                h='70'
            >


                <Button.Group>
                    <Button
                        className={classes.button}
                        size='md'
                        leftSection={<IconDeviceDesktopPlus size='24' />}
                    >
                        Create machine
                    </Button>
                    <Divider size='lg' orientation='vertical' />
                    <Button
                        className={classes.button}
                        size='md'
                        leftSection={<IconDevicesPlus size='24' />}
                    >
                        Create multiple machines
                    </Button>
                    <Divider size='lg' orientation='vertical' />
                    <Button
                        className={classes.button}
                        size='md'
                        leftSection={<IconRefresh size='24' />}
                    >
                        Refresh machines
                    </Button>
                </Button.Group>
                <Select
                    variant='filled'
                    size='md'
                    checkIconPosition="left"
                    data={['Type', 'State']}
                    leftSection={<IconArrowsSort/>}
                    placeholder="Sort by"
                    defaultValue="React"
                />
            </Group>
        </Paper>
    )
}
