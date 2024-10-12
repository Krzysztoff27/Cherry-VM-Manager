#!/usr/bin/env bash

###############################
#      root rights check
###############################

#Test to ensure that script is executed with root priviliges
if ((EUID != 0)); then
    printf '[!] Insufficient priviliges! Please run the script with root rights.'
    exit
fi

###############################
#       env variables
###############################

#Environmental variables - paths to files storing installation logs and dependencies names to be installed
readonly LOGS_DIRECTORY="../logs/vm-create/"
readonly LOGS_FILE=""$LOGS_DIRECTORY""$(date +%d-%m-%y_%H-%M-%S)".txt"

ENV_FILE=""
MACHINE_INSTANCES=""
###############################
#      utility functions
###############################

#Create logs directory
mkdir -p "$LOGS_DIRECTORY"

#Display usage of script when executed without any flags
usage() {
    echo "Usage: $0 -f <.env filename> -n <number of instances>"
    exit 1
}

#Flag handler to parse input arguments
while getopts ":f:n:" opt; do
    case $opt in
        f)
            ENV_FILE=$OPTARG
            ;;
        n)
            MACHINE_INSTANCES=$OPTARG
            ;;
        \?)
            echo "Invalid option: -$OPTARG" >&2
            usage
            ;;
        :)
            echo "Option -$OPTARG requires an argument." >&2
            usage
            ;;
    esac
done

# Check if the -f flag was provided
if [ -z "$ENV_FILE" ]; then
    echo "Error: The -f flag is mandatory."
    usage
fi

# Check if the file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: File '$ENV_FILE' not found."
    exit 1
fi

# Check if the -n flag was provided
if [ -z "$MACHINE_INSTANCES" ]; then
    echo "Error: The -n flag is mandatory."
    usage
fi

# Check if the number is a valid integer and greater than or equal to 1
if ! [[ "$MACHINE_INSTANCES" =~ ^[0-9]+$ ]] || [ "$MACHINE_INSTANCES" -lt 1 ]; then
    echo "Error: The -n flag must be an integer greater than or equal to 1."
    usage
fi

# Source the env variables file
source "$ENV_FILE"

echo $ENV_FILE
echo $MACHINE_INSTANCES
echo $DISK_IMAGE_TEMPLATE

###############################
#      creation functions
###############################

generate_uuid(){
    uuid=$(cat /proc/sys/kernel/random/uuid)
    uuid_first_segment=$(echo $uuid | cut -d'-' -f1)
}

modify_vm_template(){
    generate_uuid
    #filename=$(basename "$ENV_FILE"); filename=$(basename -s .env "$filename")
    filename=$(basename -s .env "$(basename "$ENV_FILE")")
    fullname="${filename}-${uuid_first_segment}"
    diskimage="/var/lib/libvirt/images/"$fullname".qcow2"
    echo "$filename"
    echo "$fullname"
    echo "$diskimage"
    #cp "$DISK_IMAGE_TEMPLATE" "$diskimage"
    #xsltproc --stringparam new-uuid "$uuid" --stringparam new-name "$fullname" --stringparam new-disk-source "$diskimage" \
    #opensuse-template-modify.xslt "/opt/libvirt/cherry-vm-manager/virtual-machines/opensuse-15.6-template.xml" > "/opt/libvirt/cherry-vm-manager/virtual-machines/"$fullname".xml"
}

create_vm_guest(){
    printf '\n[i] Creating virtual machine guest: '
    virsh define --file /opt/libvirt/cherry-vm-manager/virtual-machines/opensuse-leap-15.6.xml 
    printf 'OK\n'
    printf '\n[i] Starting virtual machine: '
    virsh start opensuse-leap-15.6
    printf 'OK\n'
    printf '\n[i] The VNC port for the machines is: '
    virsh vncdisplay opensuse-leap-15.6
}

###############################
#          creation
###############################

creation(){
    modify_vm_template
}
creation