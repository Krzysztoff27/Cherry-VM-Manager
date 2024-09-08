import { Container, Group, SegmentedControl, Stack } from '@mantine/core';
import { AreaChart } from '@mantine/charts';
import React, { useEffect, useState } from 'react';
import getChartProps from './getChartProps';
import { getCurrentTime } from '../../../../utils/misc';

const timePeriods = [
    {label: '10s', value: '10'},
    {label: '30s', value: '30'},
    {label: '1min', value: '60'},
    {label: '5min', value: '300'},
]

const maxKeepTime = parseInt(timePeriods.at(-1).value)

export default function MachineStateChart({ currentState }) {
    const [chosenChart, setChosenChart] = useState('CPU');
    const [timePeriod, setTimePeriod] = useState(30)
    const [chartData, setChartData] = useState(new Array(maxKeepTime).fill({}));

    useEffect(() => {
        const time = getCurrentTime();
        const newChartData = (({cpu, ram_used, ram_max}) => ({cpu, ram_used, ram_max}))(currentState);

        setChartData(pastData => [...pastData, { time: time, ...newChartData }].slice(-maxKeepTime))
    }, [currentState])

    return (
        <Stack justify='flex-end' align='flex-start' gap='xl' >
            <Group justify='space-between' w='100%'>
                <SegmentedControl
                    size="md"
                    data={Object.keys(getChartProps())}
                    onChange={setChosenChart}
                />
                <SegmentedControl
                    size="md"
                    data={timePeriods}
                    onChange={setTimePeriod}
                    withItemsBorders={false}
                    defaultValue={'30'}
                />
            </Group>
            <AreaChart
                flex='1'
                data={chartData.slice(-parseInt(timePeriod) - 1)}
                dataKey='time'
                tickLine="x"
                curveType="linear"
                {...getChartProps(currentState)[chosenChart]}
                xAxisProps={{ minTickGap: 50 }}
            />
        </Stack>
    )
}
