import { Container, Group, Image, rem, Stack, Text, Title } from '@mantine/core';
import styles from './Copyright.module.css';

export default function Copyright() {
    return (
        <Container>
            <Stack ml='xl' mr='xl' pt='xl' h='100vh' bg={'dark.7'} gap='xl'>
                <Title size={rem(48)} ta='center'>{"< Copyright >"}</Title>
                <Text ta='center'>
                    Certain elements within this web application may be protected by copyright. This includes third-party logos, dependencies, and other assets. All rights reserved for respective owners.
                </Text>
                <Group gap='gap'>
                    <Image src='/icons/Cherry Admin Panel.webp' h={rem(64)} />
                    <Text
                        xmlns:cc="http://creativecommons.org/ns#"
                        xmlns:dct="http://purl.org/dc/terms/"
                        ta='left'
                        flex='1'
                    >
                        <a href="/icons/Cherry Admin Panel.webp" property="dct:title" rel="cc:attributionURL">
                            <b>Cherry Admin Panel Logo</b>
                        </a>
                        <span> by </span>
                        <span property="cc:attributionName">Maja Cegłowska and Tomasz Kośla</span>
                        <span> is licensed under </span>
                        <a
                            href="https://creativecommons.org/licenses/by-nc-nd/4.0/?ref=chooser-v1"
                            target="_blank"
                            rel="license noopener noreferrer"
                            className={styles.ccLink}
                        >
                            CC BY-NC-ND 4.0
                            <img
                                className={styles.ccIcon}
                                src="https://mirrors.creativecommons.org/presskit/icons/cc.svg?ref=chooser-v1"
                                alt="Creative Commons icon"
                            />
                            <img
                                className={styles.ccIcon}
                                src="https://mirrors.creativecommons.org/presskit/icons/by.svg?ref=chooser-v1"
                                alt="By attribution Creative Commons icon"
                            />
                            <img
                                className={styles.ccIcon}
                                src="https://mirrors.creativecommons.org/presskit/icons/nc.svg?ref=chooser-v1"
                                alt="Noncommercial Creative Commons icon"
                            />
                            <img
                                className={styles.ccIcon}
                                src="https://mirrors.creativecommons.org/presskit/icons/nd.svg?ref=chooser-v1"
                                alt="Noderivatives Creative Commons icon"
                            />
                        </a>
                    </Text>
                </Group>
            </Stack>
        </Container>
    )
}
