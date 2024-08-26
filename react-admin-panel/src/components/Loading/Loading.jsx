import { Loader, Stack, Title } from '@mantine/core'
import React from 'react'

export default function Loading() {
    return (
        <Stack justify='center' align='center' h={'100vh'} gap='xl'>
            <Loader size='xl' type='dots'/>
            <Title order={3}>Loading page...</Title>
        </Stack>
    )
}
