#!/usr/bin/env bash

###############################
#      root rights check
###############################

#Test to ensure that script is executed with root priviliges
if ((EUID != 0)); then
    printf 'Insufficient priviliges! Please run the script with root rights.'
    exit
fi

###############################
#       env variables
###############################

#Environmental variables - paths to files storing installation logs and dependencies names to be installed
readonly LOGS_DIRECTORY='./logs/cherry-remove/'
LOGS_FILE="${LOGS_DIRECTORY}$(date +%d-%m-%y_%H-%M-%S).log"
readonly LOGS_FILE
readonly ZYPPER_PACKAGES='./dependencies/zypper_packages.txt'
readonly ZYPPER_PATTERNS='./dependencies/zypper_patterns.txt'
readonly DIR_LIBVIRT='/opt/cherry-vm-manager/libvirt'
readonly DIR_DOCKER='/opt/cherry-vm-manager/docker'

#Color definitions for distinguishable status codes
readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly YELLOW='\033[0;33m'
readonly NC='\033[0m'

###############################
#      utility functions
###############################

#Create logs directory
mkdir -p "$LOGS_DIRECTORY"

#Redirect stderr output to the logs file globally
exec 2> "$LOGS_FILE"

#Force script to call err_handler exit on ERR occurence
set -E

#Error handler to call on ERR occurence and print an error message
err_handler(){
    printf "${RED}ERR${NC}\n"
    err_occured=true
    #printf "\n[!] An error occured!\nSee the $LOGS_FILE for specific information.\n"
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

#Universal function to read dependenies names from a file
read_file(){
    packages=()
    while IFS= read -r line || [[ -n "$line" ]]; do
        packages+=("$line")
    done < "$1"
}

###############################
#      removal functions
###############################

remove_zypper_packages(){
    read_file "$ZYPPER_PACKAGES"
    if systemctl list-unit-files | grep -q '^packagekit\.service'; then
        printf '\n[i] Disabling PackageKit to prevent Zypper errors: '
        systemctl -q stop packagekit
        systemctl -q disable packagekit
        ok_handler
    else
        printf '\n[i] PackageKit not detected. Settings have not been modified.'
    fi
    for line in "${packages[@]}"; do
        clean_line="${line//[^[:alnum:]-]/}"
        printf "[i] Removing $clean_line: "
        zypper -n -q remove -t package "$clean_line" 
        ok_handler
    done
}

remove_zypper_patterns(){
    read_file "$ZYPPER_PATTERNS"
    for line in "${packages[@]}"; do
        clean_line="${line//[^[:alnum:]_]/}"
        printf "[i] Removing $clean_line: "
        zypper -n -q remove -t pattern "$clean_line"
        ok_handler
    done
}

remove_user(){
    printf '\n[i] Removing CherryWorker from system groups: '
    usermod -G '' CherryWorker
    ok_handler
    printf '[i] Removing CherryWorker system user: '
    userdel -f -r 'CherryWorker' > "$LOGS_FILE"
    ok_handler
}

configure_daemon_libvirt(){
    printf '\n[i] Disabling libvirt monolithic daemon from running on startup: '
    systemctl -q disable libvirtd.service
    ok_handler
    printf '[i] Stopping libvirt monolithic daemon: '
    systemctl -q stop libvirtd.service 
    ok_handler
    printf "[i] Removing directory structure ($DIR_LIBVIRT) and vm infrastructure .xml files: "
    rm --interactive=never -r -f "$DIR_LIBVIRT"
    ok_handler
}

configure_daemon_docker(){
    printf '\n[i] Disabling docker daemon from running on startup: '
    systemctl -q disable docker.service 
    ok_handler
    printf '[i] Stopping docker daemon: '
    systemctl -q stop docker.service 
    ok_handler
    printf "[i] Removing directory structure ($DIR_DOCKER) and docker files: "
    rm --interactive=never -r -f "$DIR_DOCKER"
    ok_handler
}

configure_container_guacamole(){
    printf '\n[i] Stopping apache-guacamole docker stack: '
    runuser -u CherryWorker -- docker-compose -f "$DIR_DOCKER/apache-guacamole/docker-compose.yml" down > "$LOGS_FILE"
    ok_handler
    #Add removal of db directory and other associated files
}

remove_vm_networks(){
    printf '\n[i] Enabling libvirt default network stack: '
    (virsh net-define --file /usr/share/libvirt/networks/default.xml > "$LOGS_FILE" && virsh net-start --network default > "$LOGS_FILE" && virsh net-autostart --network default > "$LOGS_FILE")
    ok_handler
    printf '[i] Removing a default NAT network for VMs: '
    (virsh net-undefine --network isolated-nat > "$LOGS_FILE" && virsh net-destroy --network isolated-nat  > "$LOGS_FILE")
    ok_handler
}

remove_vm_firewall(){
    printf '\n[i] Removing network filter to restrict inter VM communication: '
    virsh nwfilter-undefine isolated-nat-filter > "$LOGS_FILE"
    ok_handler
}

print_begin_notice(){
    printf "$(cat ./messages/cherry-remove_begin.txt)"
    printf '\n[?] Continue (y/n): '
    read -r -n 1 -p '' continue_execution
        if [[ "$continue_execution" != 'y' ]]; then
            printf '\n[!] Removal aborted! Exiting.\n'
            exit 1
        fi
    printf '\n'
}

print_finish_notice(){
    if [[ "$err_occured" == true ]]; then
        printf "\n${YELLOW}The removal script has finished its job, but some tasks failed to run succesfully.${NC}"
        printf "\nSee the $LOGS_FILE for specific information."
        printf '\nIt is recommended to remove the remaining components of the Cherry VM Manager stack manually.\n'
    else
        printf "\n${GREEN}The removal script has finished its job without any errors.${NC}"
        printf '\nAll components of the Cherry VM Manager stack have been removed succesfully!\n'
    #printf "$(cat ./messages/cherry-remove_finish.txt)\n"
    fi
}

###############################
#           removal
###############################

removal(){
    print_begin_notice
    remove_vm_networks
    remove_vm_firewall
    configure_container_guacamole
    configure_daemon_docker
    configure_daemon_libvirt
    remove_user
    #remove_zypper_patterns
    #remove_zypper_packages
    print_finish_notice
}
removal