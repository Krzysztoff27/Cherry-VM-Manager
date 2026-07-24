import { Avatar, Badge, Box, Card, Divider, Flex, Group, ScrollArea, SimpleGrid, Spoiler, Stack, Text, Title } from "@mantine/core";
import { contributors } from "../../../config/project.config";
import classes from "./ContributorsPage.module.css";
import useNamespaceTranslation from "../../../hooks/useNamespaceTranslation";
import { useState } from "react";
import { shuffle } from "lodash";

const ContributorsPage = () => {
    const { tns, t } = useNamespaceTranslation("pages", "contributors");
    const [developers, _] = useState(shuffle(contributors.filter((e) => e.type === "developer")));
    const [helpers, __] = useState(contributors.filter((e) => e.type === "helper"));
    const [avatars, setAvatars] = useState<Record<string, string>>(contributors.reduce((prev, e, i) => ({ ...prev, [e.name]: e.avatar }), {}));

    return (
        <ScrollArea className={classes.scrollArea}>
            <Stack className={classes.container}>
                <Title order={1}>{tns("title-developers")}</Title>
                <Box className={classes.masonry}>
                    {developers.map((developer, i) => (
                        <Box
                            className={classes.masonryPadding}
                            key={i}
                        >
                            <Card className={classes.developerCard}>
                                <Stack className={classes.mainStack}>
                                    <Avatar
                                        name={developer.name}
                                        variant="filled"
                                        src={avatars[developer.name]}
                                        onError={() => setAvatars((prev) => ({ ...prev, [developer.name]: developer.fallbackAvatar }))}
                                        className={classes.developerAvatar}
                                        size="96"
                                    />
                                    <Text className={classes.developerName}>{developer.name}</Text>
                                    <Group className={classes.badges}>
                                        {developer.contributionKeys?.map((key, i) => (
                                            <Badge
                                                variant="light"
                                                size="lg"
                                                fw={500}
                                            >
                                                {tns(`contributions.${key}`)}
                                            </Badge>
                                        ))}
                                    </Group>
                                    <Flex className={classes.description}>
                                        <Spoiler
                                            maxHeight={124}
                                            showLabel={t("show-more")}
                                            hideLabel={t("hide")}
                                            classNames={{ control: classes.spoilerControl }}
                                            ta="center"
                                            styles={{ control: { marginLeft: "50%", transform: "translate(-50%, 0)" } }}
                                        >
                                            {tns(`descriptions.${developer.descriptionKey}`)}
                                        </Spoiler>
                                    </Flex>
                                    <Divider
                                        size="sm"
                                        className={classes.divider}
                                    />
                                    <Group className={classes.bottom}>
                                        {developer?.socials?.map?.(({ name, url, icon: Icon }, i) => (
                                            <a
                                                href={url}
                                                className={classes.link}
                                            >
                                                <Icon
                                                    size="32"
                                                    stroke={1.5}
                                                />
                                            </a>
                                        ))}
                                    </Group>
                                </Stack>
                            </Card>
                        </Box>
                    ))}
                </Box>
                <Title order={1}>{tns("title-helpers")}</Title>
                <SimpleGrid
                    cols={2}
                    spacing="xl"
                >
                    {helpers.map((helper, i) => (
                        <Card
                            key={i}
                            className={classes.helperCard}
                        >
                            <Avatar
                                name={helper.name}
                                variant="default"
                                src={avatars[helper.name]}
                                onError={() => setAvatars((prev) => ({ ...prev, [helper.name]: helper.fallbackAvatar }))}
                                size="68"
                            />
                            <Stack gap="4">
                                <Text className={classes.helperName}>{helper.name}</Text>
                                <Group gap="6">
                                    {helper.contributionKeys?.map((key, i) => (
                                        <Badge
                                            variant="light"
                                            color="gray"
                                            size="md"
                                            fw={500}
                                        >
                                            {tns(`contributions.${key}`)}
                                        </Badge>
                                    ))}
                                </Group>
                            </Stack>
                            <Group
                                ml="auto"
                                pr="md"
                            >
                                {helper?.socials?.map?.(({ name, url, icon: Icon }, i) => (
                                    <a
                                        href={url}
                                        className={classes.link}
                                    >
                                        <Icon
                                            size="32"
                                            stroke={1.5}
                                        />
                                    </a>
                                ))}
                            </Group>
                        </Card>
                    ))}
                </SimpleGrid>
            </Stack>
        </ScrollArea>
    );
};

export default ContributorsPage;
