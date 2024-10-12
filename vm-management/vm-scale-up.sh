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
#       parse arguments
###############################

#Time declaration to mark log entries
time="[$(date +%d-%m-%y_%H-%M-%S)]"

# Parse command line options using getopts
while getopts ":n:" opt; do
    case ${opt} in
        n )
            instances=$OPTARG
            ;;
        \? )
            printf "${time}: [!] Invalid option: -$OPTARG\n" >&2
            exit 1
            ;;
        : )
            printf "${time}: [!] Option -$OPTARG requires an argument.\n" >&2
            exit 1
            ;;
    esac
done

#Check if a directory name argument is provided
if [ -z "$1" ]; then
    printf "${time}: [!] No directory name provided!\n" >&2
    exit 1
fi

#Assign template vm directory to DIR_VM variable
readonly VM_TEMPLATE="$1"

# Check if the number of instances argument is provided and valid
if [ -z "$2" ] || ! [[ "$2" =~ ^[0-9]+$ ]] || [ "$2" -lt 1 ]; then
    printf "${time}: [!] You must provide a valid number of instances (must be an integer >= 1).\n" >&2
    exit 1
fi

# Assign the second argument as the number of instances
instances="$2"

###############################
#       env variables
###############################

#Environmental variables - paths to files storing installation logs and dependencies names to be installed
readonly LOGS_DIRECTORY='./logs/'
readonly LOGS_FILE="${LOGS_DIRECTORY}vm-scale-up.log"

#LOGS_FILE="${LOGS_DIRECTORY}$(date +%d-%m-%y_%H-%M-%S).log"; readonly LOGS_FILE
readonly LIBVIRT_DIRECTORY='/opt/cherry-vm-manager/libvirt/'
readonly VM_DEFINITIONS='/opt/cherry-vm-manager/libvirt/virtual-machines'
readonly VM_INSTANCES='/var/opt/cherry-vm-manager/virtual-machines'

#Full vm template directory path
VM_FULL_PATH="${VM_DEFINITIONS}/${VM_TEMPLATE}"; readonly VM_FULL_PATH

#Color definitions for distinguishable status codes
readonly RED='\033[0;31m'
readonly NC='\033[0m'

#URI for virsh operations performed on the system session of qemu by CherryWorker
readonly VIRSH_DEFAULT_CONNECTION_URI='qemu:///system'

###############################
#      utility functions
###############################

#Create logs directory if it doesn't exist
if [ ! -d "$LOGS_DIRECTORY" ]; then
    mkdir -p "$LOGS_DIRECTORY"
fi

#Redirect stderr output to the logs file globally
exec 2> "$LOGS_FILE"

#Force script to call err_handler exit on ERR occurence
set -eE

#Error handler to call on ERR occurence and print an error message
err_handler(){
    printf "${RED}ERR${NC}"
    printf "\n[!] ${RED}An error occured!${NC}\nSee the $LOGS_FILE for specific information.\n"
}
trap 'err_handler' ERR

#Error handler to call on SIGINT occurence and print an error message
sigint_handler(){
    printf '\n[!] Script terminated manually!\n'
    exit 1
}
trap 'sigint_handler' SIGINT

#Return OK status only if previous command returned 0 code, otherwise err_handler is invoked
ok_handler(){
    if [ $? == 0 ]; then
        printf "${GREEN}OK${NC}\n"
    fi
}

###############################
#      template check
###############################

: '
# Check if the directory is inside the base directory and ends with .template
if [[ ! "$VM_FULL_PATH" == "$VM_DEFINITIONS/*.template" || ! -d "$VM_FULL_PATH" ]]; then
    printf "${time}: [!] The directory must be inside '$VM_DEFINITIONS' and end with '.template'.\n" >&2
    exit 1
fi


# Check for exactly one .xml file
xml_count=$(find "$VM_FULL_PATH" -maxdepth 1 -type f -name "*.xml" | wc -l)
if [ "$xml_count" -ne 1 ]; then
    printf "${time}: [!] There should be exactly one .xml file in the directory. Found $xml_count.\n" >&2
    exit 1
fi

# Check for exactly one .qcow2 file
qcow2_count=$(find "$VM_FULL_PATH" -maxdepth 1 -type f -name "*.qcow2" | wc -l)
if [ "$qcow2_count" -ne 1 ]; then
    printf "${time}: [!] There should be exactly one .qcow2 file in the directory. Found $qcow2_count.\n" >&2
    exit 1
fi

# Check for exactly one .xslt file
xslt_count=$(find "$VM_FULL_PATH" -maxdepth 1 -type f -name "*.xslt" | wc -l)
if [ "$xslt_count" -ne 1 ]; then
    printf "${time}: [!] There should be exactly one .qcow2 file in the directory. Found $xslt_count.\n" >&2
    exit 1
fi
'

###############################
#      scaling functions
###############################

generate_uuid(){
    uuid=$(cat /proc/sys/kernel/random/uuid)
    uuid_first_segment=$(echo $uuid | cut -d'-' -f1)
}

create_filenames(){
    vm_filename=$(basename --suffix=.template "$VM_FULL_PATH")
    vm_fullname="${vm_filename}-${uuid_first_segment}"
}

create_backing_image(){
    runuser -u CherryWorker -- sudo setfacl -R -m u:qemu:x "${VM_FULL_PATH}/disk-image"
    runuser -u CherryWorker -- sudo chown -R CherryWorker:CVMM /var/opt/cherry-vm-manager/virtual-machines
    disk_image=$(find "$VM_FULL_PATH/disk-image" -type f -name "*.qcow2")
    backing_image="${VM_INSTANCES}/${vm_fullname}/${vm_fullname}.qcow2"
    runuser -u CherryWorker -- mkdir -p "$VM_INSTANCES/$vm_fullname"
    runuser -u CherryWorker -- qemu-img create -f qcow2 -b "$disk_image" -F qcow2 "$backing_image" > "$LOGS_FILE"
}

modify_xml_template(){
    xslt_file=$(find "$VM_FULL_PATH" -type f -name "*.xslt")
    xml_template=$(find "$VM_FULL_PATH" -type f -name "*.xml")
    xml_file="${VM_INSTANCES}/${vm_fullname}/${vm_fullname}.xml"
    runuser -u CherryWorker -- xsltproc --stringparam new-uuid "$uuid" --stringparam new-name "$vm_fullname" --stringparam new-disk-image "$backing_image" "$xslt_file" "$xml_template" > "$xml_file"
    runuser -u CherryWorker -- sudo chown -R CherryWorker:CVMM /var/opt/cherry-vm-manager/virtual-machines
}

create_vm_guest(){
    runuser -u CherryWorker -- virsh define --file /opt/libvirt/cherry-vm-manager/virtual-machines/opensuse-leap-15.6.xml 
    runuser -u CherryWorker -- virsh start opensuse-leap-15.6
    runuser -u CherryWorker -- virsh vncdisplay opensuse-leap-15.6
}

###############################
#           scaling
###############################

scale(){
    for ((i = 0; i < instances; i++)); do
        generate_uuid
        create_filenames
        create_backing_image
        modify_xml_template
    done
}
scale