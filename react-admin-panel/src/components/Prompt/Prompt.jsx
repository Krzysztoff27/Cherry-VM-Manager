import { Button, Modal, SimpleGrid, Stack, Text, Title } from "@mantine/core"
import ReactRouterPrompt from "react-router-prompt"

export default function Prompt({when}) {
    return (
        <ReactRouterPrompt when={when}>
            {({ isActive, onConfirm, onCancel }) => (
                <Modal
                    opened={isActive}
                    onClose={onCancel}
                    withCloseButton={false}
                    overlayProps={{
                        backgroundOpacity: 0.55,
                        blur: 3,
                    }}
                >
                    <Stack gap='xs'>
                        <Text size='xl' fw={600}>You're leaving the page</Text>
                        <Text size="sm">You have unsaved changes that will be permanently lost if you leave this page. Are you sure you want to continue?</Text>
                        <SimpleGrid mt='xs' cols={2} grow='true'>
                            <Button onClick={onCancel} variant='light' color='gray' radius='sm' data-autofocus>Return</Button>
                            <Button onClick={onConfirm} variant='light' color="red.9" radius='sm'>Leave page</Button>
                        </SimpleGrid>
                    </Stack>
                </Modal>
            )}
        </ReactRouterPrompt>
    )
}


