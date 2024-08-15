import { Button, Collapse, SimpleGrid, Stack, Text } from "@mantine/core";
import { useElementSize, useLocalStorage } from "@mantine/hooks";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";

export default function CardGroup({children, group}){
    const {ref, width} = useElementSize();
    const [opened, setOpened] = useLocalStorage({key: `${group}-opened`, defaultValue: false});
    const toggle = () => setOpened((o) => !o);

    return (
        <Stack ref={ref}>
            <Button 
                onClick={toggle} 
                aria-label={`${opened ? 'Zwiń' : 'Rozwiń'} grupę maszyn wirtualnych.`}
                variant='default' 
                fullWidth
                justify='left'
                leftSection={
                    opened ?
                    <IconChevronDown size={16} stroke={1.5}/> :
                    <IconChevronRight size={16} stroke={1.5}/>
                }
            >
                <Text tt="capitalize">{group}</Text>
            </Button>

            <Collapse in={opened}>
                <SimpleGrid cols={Math.floor(width / 300)}>
                    {children}   
                </SimpleGrid>
            </Collapse>
        </Stack>
    )
}