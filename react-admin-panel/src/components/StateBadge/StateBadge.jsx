import { Badge, Loader } from "@mantine/core";
import { IconPlayerPlayFilled, IconPlayerStopFilled } from "@tabler/icons-react";

/**
 * Badge for displaying whether a virtual machine is active or not
 * @extends {Badge} Badge component from Mantine library
 * 
 * @param {Object} props
 * 
 * @param {function} props.onClick function called when the badge is clicked
 * 
 * @param {Object} props.machineState object containing data of the current state of the virtual machine
 * @param {boolean} props.machineState.active true if the machine is online
 * @param {boolean} props.machineState.loading true if the machine is currently booting up, restarting or shutting down
 * 
 * @param {Object} props.sizes determines the how large various elements of the badge are
 * @param {number|string} props.sizes.badge size of the badge
 * @param {number|string} props.sizes.icon  size of the icon in the left section of the badge
 * @param {number|string} props.sizes.loader size of the loader displayed when the badge is in the loading state
 * 
 * @returns {React.JSX.Element}
 */
export default function StateBadge({machineState, sizes = {badge: 'md', icon: 10, loader: 'sm'}, onClick}) {
    return ( 
        <Badge 
            size={sizes.badge}
            onClick={onClick}
            color={
                machineState.active ? 'suse-green.8' : 
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
