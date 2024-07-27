import { notifications } from "@mantine/notifications";
import { IconX } from "@tabler/icons-react";


export const showError = (options) => notifications.show({
    withCloseButton: true,
    autoClose: options.autoClose ?? 10000,
    title: options.title,
    id: options.id ?? 'error-id',
    message: options.message,
    color: 'red',
    icon: <IconX />,
    className: options.className ?? 'error-class',
    loading: false,
});

export default {showError};