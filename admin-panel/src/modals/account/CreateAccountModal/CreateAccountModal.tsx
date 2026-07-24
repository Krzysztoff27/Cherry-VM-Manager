import { ActionIcon, Avatar, Box, Button, Group, Modal, PasswordInput, rem, Select, SimpleGrid, Stack, TextInput } from "@mantine/core";
import useNamespaceTranslation from "../../../hooks/useNamespaceTranslation";
import { hasLength, matchesField, useForm } from "@mantine/form";
import { useState } from "react";
import PasswordInputWithStrength from "../../../components/molecules/interactive/PasswordInputWithStrength/PasswordInputWithStrength";
import useApi from "../../../hooks/useApi";
import useErrorHandler from "../../../hooks/useErrorHandler";
import useMantineNotifications from "../../../hooks/useMantineNotifications";
import RoleMultiselect from "../../../components/atoms/interactive/RoleMultiselect/RoleMultiselect";
import GroupMultiselect from "../../../components/atoms/interactive/GroupMultiselect/GroupMultiselect";
import { AxiosError, isAxiosError } from "axios";
import { IconHexagonAsterisk } from "@tabler/icons-react";
import { AccountType } from "../../../types/config.types";
import { useDisclosure } from "@mantine/hooks";
import _ from "lodash";
import { generatePassword } from "../../../utils/users";

export interface CreateAccountModalProps {
    opened: boolean;
    onClose: () => void;
    onSubmit: () => void;
    accountType: AccountType;
}

export default function CreateAccountModal({ opened, onClose, onSubmit, accountType }: CreateAccountModalProps): React.JSX.Element {
    const [fullName, setFullName] = useState("");
    const [passwordVisible, { toggle: togglePasswordVisible, open: viewPassword }] = useDisclosure(false);
    const { t, tns } = useNamespaceTranslation("modals", "account");
    const { sendRequest } = useApi();
    const { handleAxiosError } = useErrorHandler();
    const { sendNotification } = useMantineNotifications();

    const form = useForm({
        initialValues: {
            name: "",
            surname: "",
            username: "",
            email: "",
            password: "",
            confirmPassword: "",
            roles: [],
            groups: [],
        },

        validate: {
            name: hasLength({ max: 50 }, tns("validation.name-too-long")),
            surname: hasLength({ max: 50 }, tns("validation.surname-too-long")),
            username: (val) =>
                /\s/.test(val)
                    ? tns("validation.username-spaces")
                    : !/^[\w.-]+$/.test(val)
                      ? tns("validation.username-invalid-characters")
                      : !/[a-zA-Z]/.test(val[0])
                        ? tns("validation.username-invalid-first")
                        : val.length < 3
                          ? tns("validation.username-too-short")
                          : val.length > 24
                            ? tns("validation.username-too-long")
                            : null,
            email: (val) => (val.length && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/.test(val) ? tns("validation.email-invalid") : null),
            password: (val) =>
                val.length < 10
                    ? tns("validation.password-too-short")
                    : !/[0-9]/.test(val)
                      ? tns("validation.password-no-number")
                      : !/[a-z]/.test(val)
                        ? tns("validation.password-no-lowercase")
                        : !/[A-Z]/.test(val)
                          ? tns("validation.password-no-uppercase")
                          : !/[$&+,:;=?@#|'<>.^*()%!_-]/.test(val)
                            ? tns("validation.password-no-special")
                            : null,
            confirmPassword: matchesField("password", tns("validation.passwords-not-equal")),
        },
        onValuesChange: (values) => {
            setFullName(values.name || values.surname ? `${values.name} ${values.surname}` : values.username);
            form.setFieldValue("username", values.username.toLowerCase());
        },
    });

    const closeModal = () => {
        form.reset();
        onClose();
    };

    const onPostError = (error: AxiosError) => {
        if (error.response?.status != 409) return handleAxiosError(error);

        const data = error.response?.data as Record<string, any>;
        const detail = data?.detail;

        ["username", "email"].forEach((field) => {
            if (detail.includes(field)) form.setFieldError(field, tns(`validation.${field}-duplicate`));
        });
    };

    const onFormSubmit = form.onSubmit(async ({ confirmPassword: _, ...values }) => {
        const body = { account_type: accountType, ...values } as any;
        if (accountType === "administrative") delete body.groups;
        else if (accountType === "client") delete body.roles;

        const res = await sendRequest("POST", "users/create", { data: body }, onPostError);
        if (isAxiosError(res)) return;

        sendNotification("account.created", undefined, { username: body.username });
        closeModal();
        onSubmit?.();
    });

    const onGeneratePassword = () => {
        const generatedPassword = generatePassword();
        form.setValues((prev) => ({ ...prev, password: generatedPassword, confirmPassword: generatedPassword }));
        viewPassword();
    };

    return (
        <Modal
            opened={opened}
            onClose={closeModal}
            title={tns("title-create")}
            size="480"
        >
            <form onSubmit={onFormSubmit}>
                <Stack>
                    <Group
                        align="top"
                        justify="space-between"
                    >
                        <Stack>
                            <TextInput
                                placeholder={t("name")}
                                w={300}
                                classNames={{ input: "borderless" }}
                                key={form.key("name")}
                                {...form.getInputProps("name")}
                            />
                            <TextInput
                                placeholder={t("surname")}
                                w={300}
                                classNames={{ input: "borderless" }}
                                key={form.key("surname")}
                                {...form.getInputProps("surname")}
                            />
                            <TextInput
                                placeholder={t("username")}
                                w={300}
                                key={form.key("username")}
                                classNames={{ input: "borderless" }}
                                {...form.getInputProps("username")}
                            />
                            <TextInput
                                placeholder={t("email")}
                                w={300}
                                key={form.key("email")}
                                classNames={{ input: "borderless" }}
                                {...form.getInputProps("email")}
                            />
                        </Stack>
                        <Avatar
                            name={fullName}
                            size={rem(128)}
                            color={fullName.length > 1 ? "initials" : undefined}
                        />
                    </Group>
                    <Group gap="xs">
                        <Box flex={1}>
                            <PasswordInputWithStrength
                                label={tns("account-password")}
                                placeholder={tns("password-placeholder")}
                                key={form.key("password")}
                                {...form.getInputProps("password")}
                                classNames={{ input: "borderless" }}
                                visible={passwordVisible}
                                onVisibilityChange={togglePasswordVisible}
                            />
                        </Box>
                        <ActionIcon
                            mt="26px"
                            size="lg"
                            variant="default"
                            className="borderless"
                            onClick={onGeneratePassword}
                        >
                            <IconHexagonAsterisk size="24" />
                        </ActionIcon>
                    </Group>
                    <PasswordInput
                        label={tns("confirm-password")}
                        placeholder={tns("confirm-password-placeholder")}
                        key={form.key("confirmPassword")}
                        classNames={{ input: "borderless" }}
                        {...form.getInputProps("confirmPassword")}
                    />
                    <Select
                        label={tns("account-type")}
                        data={[tns(`${accountType}`)]}
                        value={tns(`${accountType}`)}
                        disabled
                        autoFocus={false}
                    />
                    {accountType === "administrative" ? (
                        <RoleMultiselect
                            clearable
                            classNames={{ input: "borderless" }}
                            placeholder={tns("select-roles")}
                            key={form.key("roles")}
                            {...form.getInputProps("roles")}
                            autoFocus
                        />
                    ) : (
                        <GroupMultiselect
                            clearable
                            classNames={{ input: "borderless" }}
                            placeholder={tns("select-groups")}
                            key={form.key("groups")}
                            {...form.getInputProps("groups")}
                            autoFocus
                        />
                    )}
                    <SimpleGrid cols={2}>
                        <Button
                            onClick={closeModal}
                            variant="default"
                            className="borderless"
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            type="submit"
                            variant="white"
                            fw="700"
                        >
                            {t("confirm")}
                        </Button>
                    </SimpleGrid>
                </Stack>
            </form>
        </Modal>
    );
}
