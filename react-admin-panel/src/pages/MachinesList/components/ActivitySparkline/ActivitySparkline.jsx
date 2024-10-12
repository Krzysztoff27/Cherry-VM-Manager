import { Sparkline } from "@mantine/charts";
import { Container, Divider, Paper, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import classes from './ActivitySparkline.module.css';

const MAX_DATA_POINTS = 6;
const prepareData = (data) => [...data?.slice(0, MAX_DATA_POINTS / 2), 50, 50, 100, 50, 50, ...data?.slice(MAX_DATA_POINTS / 2)];
// Inserts 50ies in the middle of data to make the chart lines look like they come out of the label. 
// Also one "100" entry is present to set the chart height to constant 100.
// Otherwise, the chart range would be dynamic based on current max value and it wouldn't be centered vertically.

/**
 * In the inactive state view there's no point in using the Sparkline graph,
 * To create a straight line, mantine's divider is used instead.
 * @param {string} label label of the divider
 * @param {string} cssClass class with properties for the divider such as color
 * @returns 
 */
const getInactiveStateView = (label, cssClass) => (
    <Container className={classes.mainContainer}>
        <Divider label={label} classNames={{
            root: classes.dividerRoot,
            label: `${classes.labelText} ${cssClass}`
        }} />
    </Container>
)

/**
 * A component that displays CPU activity of a virtual machine using a Sparkline step graph.
 * When the machine is online, the graph shows the CPU activity with lines originating from the central label.
 * When the machine is offline, loading, or in a fetching state, the component shows a divider with a label
 * indicating the current status (e.g., 'OFFLINE', 'LOADING', or 'FETCHING').
 *
 * @param {Object} props - The properties passed to the component.
 * @param {Object} props.currentState - The current state of the virtual machine, used to determine the display and activity.
 * @param {string} props.currentState.uuid - The UUID of the machine.
 * @param {boolean} props.currentState.active - A flag indicating whether the machine is currently online and active.
 * @param {boolean} props.currentState.loading - A flag indicating whether the machine is currently in a loading state (e.g., booting or shutting down).
 * @param {number} [props.currentState.cpu=0] - The current CPU usage of the machine (defaults to 0 if not provided).
 *
 * @returns {React.JSX.Element} - Renders either a Mantine Sparkline chart or a Mantine Divider with a status label, depending on the machine's state.
 */
export default function ActivitySparkline({ currentState }) {
    const [chartData, setChartData] = useState(Array.from({length: 6}, () => 50));

    // update the chart data with new cpu state
    useEffect(() => {
        setChartData(prev => [...prev, currentState?.cpu || 0].slice(-6))
    }, [currentState]);

    if (!currentState)        return getInactiveStateView('FETCHING', classes.fetching);
    if (currentState.loading) return getInactiveStateView('LOADING', classes.loading);
    if (!currentState.active) return getInactiveStateView('OFFLINE', classes.offline);

    return (
        <Container className={classes.mainContainer}>
            <Sparkline
                className={classes.sparkline}
                data={prepareData(chartData)}
                curveType='step'
                color='suse-green.7'
                fillOpacity={0.2}
            />

            <Stack className={classes.labelContainer}>
                <Paper className={classes.labelBackground} shadow='0'>
                    <Text className={`${classes.labelText} ${classes.online}`}>
                        ONLINE
                    </Text>
                </Paper>
            </Stack>
        </Container>
    )
}
