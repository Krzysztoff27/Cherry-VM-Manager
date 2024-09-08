import { Button, Collapse, SimpleGrid, Stack, Text } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { useCookies } from "react-cookie";

export default function CardGroup({children, group}){
    const cookieName = `${group}-opened`;

    const [cookies, setCookies] = useCookies([cookieName]);
    const {ref, width} = useElementSize();
    
    const toggle = () => setCookies(cookieName, !cookies[cookieName], {path: '/virtual-machines'});
    const opened = cookies[cookieName];

    return (
        <Stack ref={ref}>
            <Button 
                onClick={toggle} 
                aria-label={`${opened ? 'Collapse' : 'Expand'} the virtual machine group.`}
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
                    {width ? children : null}   
                </SimpleGrid>
            </Collapse>
        </Stack>
    )
}