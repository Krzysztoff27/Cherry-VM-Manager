import { Loader, rem, Stack } from '@mantine/core'
import React from 'react'

export default function Loading() {
    return (
        <Stack justify='center' align='center' h={'100vh'} gap='xl'>
            <Loader size={rem(64)} type='dots' color='gray.1'/>
        </Stack>
    )
}
