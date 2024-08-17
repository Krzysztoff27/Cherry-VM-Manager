#!/usr/bin/env bash

###############################
#       env variables
###############################

#Environmental variables - paths to files storing installation logs and dependencies names to be installed
readonly LOGS_FILE="./logs/vm-install/"$(date +%d-%m-%y_%H-%M-%S)".txt"

###############################
#   installation functions
###############################

configure_vm_networks(){
    echo -n '[i] Creating a default NAT network for VMs and making it persistent: '
    virsh net-define --file /opt/libvirt/cherry-vm-manager/networks/isolated-nat.xml >> "$LOGS_FILE" 2>&1 #Test for ERR throwing after fixing the error_handler() trap
    virsh net-autostart --network isolated-nat >> "$LOGS_FILE" 2>&1 #Test for ERR throwing after fixing the error_handler() trap
    virsh net-start --network isolated-nat >> "$LOGS_FILE" 2>&1 #Test for ERR throwing after fixing the error_handler() trap
    echo 'OK' 
}

###############################
#   actual installation
###############################

#Test to ensure that script is run with root priviliges
if (($EUID != 0)); then
    echo "Insufficient priviliges! Please run the script with root rights."
    exit
fi

installation(){
    configure_vm_networks
}

configure_vm_networks