import { Badge, Loader } from "@mantine/core";
import { IconPlayerPlayFilled, IconPlayerStopFilled } from "@tabler/icons-react";


export default function StateBadge({machineState, sizes = {badge: 'md', icon: 10, loader: 'sm'}, onClick}) {
    return ( 
        <Badge 
            size={sizes.badge}
            onClick={onClick}
            color={
                machineState.active ? 'suse-green' : 
                machineState.loading ? 'yellow.5' : 'red.6'
            } 
            variant={
                machineState.active ? 'filled' : 
                machineState.loading ? 'outline' : 'outline'} 
            leftSection={
                machineState.active ? <IconPlayerPlayFilled size={sizes.icon}/> :
                machineState.loading ? null : <IconPlayerStopFilled size={sizes.icon}/>}
        >
            {
                machineState.active ? 'on' : 
                machineState.loading ? <Loader color='yellow.5' type='dots' size={sizes.loader}/> : 'off'
            }
        </Badge>
    )
}
