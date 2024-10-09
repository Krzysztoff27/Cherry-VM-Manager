import { Button, Card, Collapse, Divider, Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { useResizeObserver } from "@mantine/hooks";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { useCookies } from "react-cookie";

export default function CardGroup({ children, group }) {
    const cookieName = `${group}-opened`;

    const [cookies, setCookies] = useCookies([cookieName]);
    const [containerRef, rect] = useResizeObserver();

    const toggle = () => setCookies(cookieName, !cookies[cookieName], { path: '/virtual-machines' });

    const groupLabel =
        <Group gap='6' align='center' c='cherry.4'>
            {cookies[cookieName] ?
                <IconChevronDown size={28} stroke={3} /> :
                <IconChevronRight size={28} stroke={3} />
            }
            <Text tt='capitalize' fw='5600' fz='26' c='cherry.4'>{group}</Text>
        </Group>

    return (
        <Stack ref={containerRef}>
            <Button
                onClick={toggle}
                aria-label={`${cookies[cookieName] ? 'Collapse' : 'Expand'} the virtual machine group.`}
                variant='transparent'
                styles={{ label: { width: '100%' } }}
            >
                <Divider
                    color='#8f8f8f'
                    size='lg'
                    // flex='1'
                    label={groupLabel}
                    labelPosition='left'
                />
            </Button>

            <Collapse in={cookies[cookieName]} ml='xl' mr='xl'>
                <SimpleGrid cols={Math.max(Math.floor(rect.width / 300), 1)}>
                    {cookies[cookieName] ? children : Array.from({length: children.length}, (_, i) => <Card key={i} h={240}/>)}
                </SimpleGrid>
            </Collapse>
        </Stack>
    )
}