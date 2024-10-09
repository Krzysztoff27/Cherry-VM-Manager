import { Sparkline } from "@mantine/charts";
import { Container, Divider, Paper, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import classes from './ActivitySparkline.module.css';

const MAX_DATA_POINTS = 6;
const prepareData = (data) => [...data?.slice(0, MAX_DATA_POINTS / 2), 50, 50, 100, 50, 50, ...data?.slice(MAX_DATA_POINTS / 2)];
// insert 50ies in the middle of data to make the chart lines look like they come out of the label. 
// Also one 100 is present to set the chart height to constant.

export default function ActivitySparkline({ currentState }) {
    const [chartData, setChartData] = useState(Array.from({length: 6}, () => 50));

    useEffect(() => {
        // update the chart data with new cpu state
        setChartData(prev => [...prev, currentState?.cpu || 0].slice(-6))
    }, [currentState]);

    const getInactiveStateView = (label, cssClass) => (
        <Container className={classes.mainContainer}>
            <Divider label={label} classNames={{
                root: classes.dividerRoot,
                label: `${classes.labelText} ${cssClass}`
            }} />
        </Container>
    )

    if (!currentState)        return getInactiveStateView('FETCHING', classes.fetching);
    if (currentState.loading) return getInactiveStateView('LOADING', classes.loading);
    if (!currentState.active) return getInactiveStateView('OFFLINE', classes.offline);

    return (
        <Container className={classes.mainContainer}>
            <Sparkline
                w='100%' h='60'
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
        </Container>)
}
