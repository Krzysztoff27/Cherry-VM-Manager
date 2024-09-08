const getChartProps = (currentState = {}) => ({
        CPU: {
            yAxisProps: { domain: [0, 100], width: 80 },
            series: [{ name: 'cpu', color: 'indigo.6', label: 'CPU used' }],
            unit: '%'
        },
        RAM: {
            yAxisProps: currentState.ram_max ? { domain: [0, currentState.ram_max], tickCount: 12, width: 80 } : undefined,
            series: [{ name: 'ram_used', color: 'teal.6', label: 'RAM used' }],
            unit: ' MB'
        }
    }
);

export default getChartProps;