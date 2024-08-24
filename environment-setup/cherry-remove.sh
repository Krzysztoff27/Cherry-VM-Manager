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

###############################
#      utility functions
###############################

#Create logs directory
mkdir -p "$LOGS_DIRECTORY"

#Redirect stderr output to the logs file globally
exec 2> "$LOGS_FILE"

#Force script to call err_handler exit on ERR occurence
set -eE

#Error handler to call on ERR occurence and print an error message
err_handler(){
    printf 'ERR'
    printf "\n[!] An error occured!\nSee the $LOGS_FILE for specific information.\n"
}
trap 'err_handler' ERR

#Error handler to call on SIGINT occurence and print an error message
sigint_handler(){
    printf '\n[!] Installation terminated manually!\n'
    exit 1
}
trap 'sigint_handler' SIGINT

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
        printf 'OK\n'
    else
        printf '\n[i] PackageKit not detected. Settings have not been modified.'
    fi
    for line in "${packages[@]}"; do
        clean_line="${line//[^[:alnum:]-]/}"
        printf "[i] Removing $clean_line: "
        zypper -n -q remove -t package "$clean_line" 
        printf 'OK\n'
    done
}

remove_zypper_patterns(){
    read_file "$ZYPPER_PATTERNS"
    for line in "${packages[@]}"; do
        clean_line="${line//[^[:alnum:]_]/}"
        printf "[i] Removing $clean_line: "
        zypper -n -q remove -t pattern "$clean_line"
        printf 'OK\n'
    done
}

remove_user(){
    printf '[i] Removing CherryWorker from system groups: '
    usermod -G '' CherryWorker
    printf 'OK\n'
    printf '\n[i] Removing CherryWorker system user: '
    userdel -f -r 'CherryWorker' > "$LOGS_FILE"
    printf 'OK\n'
}

configure_daemon_libvirt(){
    printf '\n[i] Disabling libvirt monolithic daemon from running on startup: '
    systemctl -q disable libvirtd.service
    printf 'OK\n'
    printf '[i] Stopping libvirt monolithic daemon: '
    systemctl -q stop libvirtd.service 
    printf 'OK\n'
    printf "[i] Removing directory structure ($DIR_LIBVIRT) and vm infrastructure .xml files: "
    rm --interactive=never -r -f "$DIR_LIBVIRT"
    printf 'OK\n'
}

configure_daemon_docker(){
    printf '\n[i] Disabling docker daemon from running on startup: '
    systemctl -q disable docker.service 
    printf 'OK\n'
    printf '[i] Stopping docker daemon: '
    systemctl -q stop docker.service 
    printf 'OK\n'
    printf "[i] Removing directory structure ($DIR_DOCKER) and docker files: "
    rm --interactive=never -r -f "$DIR_DOCKER"
    printf 'OK\n'
}

configure_container_guacamole(){
    printf '[i] Stopping apache-guacamole docker stack: '
    runuser -u CherryWorker -- docker-compose -f "$DIR_DOCKER/apache-guacamole/docker-compose.yml" down > "$LOGS_FILE"
    printf 'OK\n'
    #Add removal of db directory and other associated files
}

###############################
#       actual removal
###############################

removal(){
    configure_container_guacamole
    configure_daemon_docker
    configure_daemon_libvirt
    remove_user
    remove_zypper_patterns
    remove_zypper_packages
}
