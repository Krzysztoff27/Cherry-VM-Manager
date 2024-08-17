#!/usr/bin/env bash

###############################
#       env variables
###############################

#Environmental variables - paths to files storing installation logs and dependencies names to be installed
readonly LOGS_FILE="./logs/vm-remove/"$(date +%d-%m-%y_%H-%M-%S)".txt"

###############################
#      removal functions
###############################

remove_vm_networks(){
    echo -n '[i] Removing a default NAT network for VMs:'
    virsh net-undefine isolated-nat >> "$LOGS_FILE" 2>&1 #Test for ERR throwing after fixing the error_handler() trap
    echo 'OK' 
}

###############################
#       actual removal
###############################

#Test to ensure that script is run with root priviliges
if (($EUID != 0)); then
    echo "Insufficient priviliges! Please run the script with root rights."
    exit
fi

installation(){
    remove_vm_networks
}

remove_vm_networks