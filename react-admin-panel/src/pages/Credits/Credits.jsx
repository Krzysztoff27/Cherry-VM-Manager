import { ActionIcon, Avatar, AvatarGroup, Center, Container, Divider, Group, List, rem, Stack, Text, Title } from "@mantine/core";
import FadingScroll from "../../components/FadingScroll/FadingScroll";
import credits from "./data";
import styles from './Credits.module.css';
import CreditsLine from "./components/CreditsLine";
import { IconArrowBackUp, IconHome, IconHome2, IconHomeFilled } from '@tabler/icons-react'
import {useNavigate} from 'react-router-dom'


export default function Credits() {
    const navigate = useNavigate();

    return (
        <Container>
            <Stack p={'xl'}>
                <Group justify='' align='flex-end' pl='xs' pr='xs'>
                    <ActionIcon onClick={() => navigate(-1)} size='lg' color='gray' variant="light"><IconArrowBackUp /></ActionIcon>
                    <ActionIcon onClick={() => navigate('/')} size='lg' color='gray' variant="light"><IconHomeFilled /></ActionIcon>
                </Group>
                <Divider />
                <FadingScroll h='80vh' mt='sm' pl='xl' pr='xl'>
                    <Stack>
                        <Title size={rem(36)} ta='center' mt='sm'>{'< Project >'}</Title>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque vehicula semper felis at fringilla. Sed blandit semper nisi a ornare. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus ac bibendum turpis, quis tempor lectus. Morbi sollicitudin lacus at malesuada condimentum. Donec scelerisque porttitor rhoncus. Praesent posuere, felis vitae egestas lacinia, nulla erat lobortis turpis, id sodales mi mi quis massa. Fusce libero massa, bibendum a velit at, molestie hendrerit sem. Suspendisse fringilla dictum vulputate. Nullam vulputate vel diam nec tempor. Morbi eu elit lobortis, volutpat leo eu, semper sapien.
                        <Title order={2} ta='center' mt='sm'>{'< Team >'}</Title>
                        {...credits.map((data, i) => <CreditsLine key={i} data={data} />)}
                        <Title order={2} ta='center' mt='sm'>{'< Site >'}</Title>
                        <Text className={styles.text}>
                            Website built using <a href='https://react.dev/'>React</a> with use of <a href='https://mantine.dev/'>Mantine</a> library components. Network panel based on <a href='https://reactflow.dev/'>React Flow</a> component. Site's icons provided by <a href='https://tabler.io/icons'>Tabler-Icons</a>.
                        </Text>
                    </Stack>
                </FadingScroll>
            </Stack>
        </Container>
    )
}
