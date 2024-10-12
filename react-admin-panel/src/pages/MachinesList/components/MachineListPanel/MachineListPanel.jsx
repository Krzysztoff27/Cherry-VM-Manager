import { Button, Divider, Group, Paper, Popover, Radio, Stack } from "@mantine/core";
import { IconDeviceDesktopPlus, IconDevicesPlus, IconRefresh, IconStack2Filled } from "@tabler/icons-react";
import { useState } from "react";
import classes from './MachineListPanel.module.css';

/**
 * Header panel for the Machine List page, providing controls for creating and managing virtual machines,
 * as well as options for modifying the grouping criteria of the machine list.
 *
 * @param {Object} props - The properties passed to the component.
 * @param {string} props.groupBy - The current property used to group the machines in the machine list .
 * @param {function} props.setGroupBy - Callback function to update the property by which the machines are grouped.
 * @param {function} props.refreshNetworkData - Function to refresh and reload the machine data.
 * @returns {JSX.Element} 
 */
export default function MachineListPanel({groupBy, setGroupBy, refreshNetworkData}) {
    const [groupButtonOpened, setGroupButtonOpened] = useState(false);

    return (
        <Paper bg='dark.6' radius={0}>
            <Group className={classes.buttonGroup}>
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
                <Popover width="target" trapFocus offset={0} onChange={setGroupButtonOpened}>
                    <Popover.Target>
                        <Button
                            className={`${classes.button} ${groupButtonOpened ? classes.groupByOpened : ''}`}
                            size='md'
                            leftSection={<IconStack2Filled size='24' />}
                        >
                            Group by
                        </Button>
                    </Popover.Target>
                    <Popover.Dropdown className={classes.groupByDropdown}>
                        <Radio.Group
                            value={groupBy}
                            onChange={setGroupBy}
                        >
                            <Stack>
                                <Radio classNames={{label: classes.radioLabel}} value="group" label="Type"/>
                                <Radio classNames={{label: classes.radioLabel}} value="state" label="State" />
                                <Radio classNames={{label: classes.radioLabel}} value="membership" label="Membership" />
                            </Stack>
                        </Radio.Group>
                    </Popover.Dropdown>
                </Popover>
            </Group>
        </Paper>
    )
}

