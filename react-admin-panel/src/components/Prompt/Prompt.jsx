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
                    <Stack>
                        <Title order={5}>Potwierdzenie opuszczenia strony</Title>
                        <Text size="sm">
                            Masz niezapisane zmiany, które zostaną utracone, jeśli opuścisz tę stronę. Czy na pewno chcesz kontynuować?
                        </Text>
                        <SimpleGrid cols={2} grow='true'>
                            <Button onClick={onCancel} variant='light' color='gray' radius='sm' data-autofocus>Powróć</Button>
                            <Button onClick={onConfirm} variant='light' color="red.9" radius='sm'>Opuść stronę</Button>
                        </SimpleGrid>
                    </Stack>
                </Modal>
            )}
        </ReactRouterPrompt>
    )
}


