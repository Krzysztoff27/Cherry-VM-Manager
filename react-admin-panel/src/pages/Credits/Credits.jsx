import { Container, rem, Stack, Text, Title } from "@mantine/core";
import FadingScroll from "../../components/FadingScroll/FadingScroll";
import credits from "./data";
import styles from './Credits.module.css';
import CreditsLine from "./components/CreditsLine";
import Snowfall from 'react-snowfall';

const getImageElement = (src) => {
    const img = new Image();
    img.src = src;
    return img;
}

const images = [
    getImageElement('/icons/Cherry Admin Panel.webp'), 
    getImageElement('/icons/Tux.webp'), 
    getImageElement('/icons/Geeko Button Green.webp'),
];

export default function Credits() {
    return (
        <Container>
            <Stack ml='xl' mr='xl' pt='xl' h='100vh' bg={'dark.7'}>
                <Title size={rem(48)} ta='center'>{"< Credits >"}</Title>
                <FadingScroll h='80vh' mt='sm' pl='xl' pr='xl'>
                    <Stack>
                        <Title order={2} ta='center' mt='sm'>{'< Team >'}</Title>
                        {...credits.map((data, i) => <CreditsLine key={i} data={data} />)}
                        <Title order={2} ta='center' mt='sm'>{'< Site >'}</Title>
                        <Text className={styles.text}>
                            This website is developed using <a href='https://react.dev/'>React</a>, incorporating components from the <a href='https://mantine.dev/'>Mantine</a> library. The network panel is built on the <a href='https://reactflow.dev/'>React Flow component</a>. Icons used are sourced from <a href='https://tabler.io/icons'>Tabler Icons</a>.
                        </Text>
                    </Stack>
                </FadingScroll>
            </Stack>
            <Snowfall
                style={{zIndex: -1}}
                radius={[50,35]}
                wind={[-0.5, 0.5]}
                speed={[1, 2]}
                snowflakeCount={25}
                images={images}
            />
        </Container>
    )
}
