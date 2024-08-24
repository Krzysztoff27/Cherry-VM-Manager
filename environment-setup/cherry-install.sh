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
readonly LOGS_DIRECTORY='./logs/cherry-install/'
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
#   installation functions
###############################

install_zypper_packages(){
    read_file "$ZYPPER_PACKAGES"
    if systemctl list-unit-files | grep -q '^packagekit\.service'; then
        printf '\n[i] Disabling PackageKit to prevent Zypper errors: '
        systemctl -q stop packagekit
        systemctl -q disable packagekit
        printf 'OK\n'
    else
        printf '\n[i] PackageKit not detected. Settings have not been modified.'
    fi
    printf '\n[i] Refreshing zypper repositories: '
    zypper -n -q refresh > "$LOGS_FILE"
    printf 'OK\n'
    for line in "${packages[@]}"; do
        clean_line="${line//[^[:alnum:]-]/}"
        printf "[i] Installing $clean_line: "
        zypper -n -q install -t package "$clean_line" 
        printf 'OK\n'
    done
}

install_zypper_patterns(){
    read_file "$ZYPPER_PATTERNS"
    for line in "${packages[@]}"; do
        clean_line="${line//[^[:alnum:]_]/}"
        printf "[i] Installing $clean_line: "
        zypper -n -q install -t pattern "$clean_line"
        printf 'OK\n'
    done
}

create_user(){
    printf '\n[i] Creating CherryWorker system user: '
    useradd -r -M -s '/usr/bin/false' -c 'Cherry-VM-Manager system user' 'CherryWorker'
    printf 'OK\n'
    printf '[i] Creating CherryWorker home directory: '
    mkdir /home/CherryWorker
    chown CherryWorker:users /home/CherryWorker
    chmod 700 /home/CherryWorker
    printf 'OK\n'
    printf '[i] Adding CherryWorker to system groups: '
    usermod -a -G docker,libvirt CherryWorker
    printf 'OK\n'
}

#Function to check for nested virtualization support and state on the host system.
#For nested-v to work it needs to be specified in the kvm daemon settings prior to enabling libvirt service
#and kvm kernel modules need to be reloaded.
configure_daemon_kvm(){
    cpu_model=$(grep "model name" /proc/cpuinfo -m 1 | awk -F: '{print $2}';)
    if echo "$cpu_model" | grep -q -i "Intel"; then
        cpu_producer='intel'
        if (grep -q "vmx" /proc/cpuinfo); then
            nested_support=true
        fi
    elif echo "$cpu_model" | grep -q -i "AMD"; then
        cpu_producer='amd'
        if (grep -q "svm" /proc/cpuinfo); then
            nested_support=true
        fi
    else
        printf '\nUnrecognized CPU, cannot proceed with KVM configuration.' > "$LOGS_FILE"
        exit 1 
    fi

    nested_state=$(cat /sys/module/kvm_"$cpu_producer"/parameters/nested)
    if [[ "$nested_support" == true ]]; then
        printf '\n'
        if [[ "$nested_state" != 'Y' ]]; then
            read -r -p '[?] Detected nested virtualization support. Enable? (y/n): ' enable_nested
            if [[ "$enable_nested" == 'y' ]]; then
                modprobe -r kvm_"$cpu_producer"
                modprobe kvm_"$cpu_producer" nested=1
                echo "options kvm_$cpu_producer nested=1" > '/etc/modprobe.d/kvm.conf'
                printf '[i] Nested virtualization enabled.\n'
            else
                printf '[i] Nested virtualization not enabled.\n'
            fi
        else
            printf '[i] Nested virtualization enabled prior to installation. Settings have not been modified.\n'
        fi
    fi
}

configure_daemon_libvirt(){
    printf '\n[i] Enabling libvirt monolithic daemon to run on startup: '
    systemctl -q enable libvirtd.service
    printf 'OK\n'
    printf '[i] Starting libvirt monolithic daemon: '
    systemctl -q start libvirtd.service 
    printf 'OK\n'
    printf "[i] Creating directory structure ($DIR_LIBVIRT) and copying vm infrastructure .xml files: "
    mkdir -p "$DIR_LIBVIRT"
    cp -r ../libvirt/. "$DIR_LIBVIRT"
    printf 'OK\n'
}

configure_daemon_docker(){
    printf '\n[i] Enabling docker daemon to run on startup: '
    systemctl -q enable docker.service 
    printf 'OK\n'
    printf '[i] Starting docker daemon: '
    systemctl -q start docker.service 
    printf 'OK\n'
    printf "[i] Creating directory structure ($DIR_DOCKER) and copying docker files: "
    mkdir -p "$DIR_DOCKER"
    cp -r ../docker/. "$DIR_DOCKER"
    printf 'OK\n'
}

configure_container_guacamole(){
    printf '\n[i] Creating initdb.sql SQL script for Apache Guacamole PostgreSQL db: '
    runuser -u CherryWorker -- docker run -q --rm guacamole/guacamole /opt/guacamole/bin/initdb.sh --postgresql > "$DIR_DOCKER/apache-guacamole/initdb/01-initdb.sql"
    printf 'OK\n'
    printf '[i] Starting apache-guacamole docker stack: '
    runuser -u CherryWorker -- docker-compose -f "$DIR_DOCKER/apache-guacamole/docker-compose.yml" up -d > "$LOGS_FILE"
    printf 'OK\n'
}

print_begin_notice(){
    printf "$(cat ./messages/begin_notice.txt)"
    printf '[?] Continue (y/n): '
    read -r -n 1 -p '' continue_installation
        if [[ "$continue_installation" != 'y' ]]; then
            printf '\n[!] Installation aborted! Exiting.\n'
            exit 1
        fi
    printf '\n'
}

print_finish_notice(){
    printf "$(cat ./messages/finish_notice.txt)\n"
}

###############################
#   actual installation
###############################

#Calls for certain functions - parts of the whole environment initialization process

#Parts invoked in one function to allow implementation of stage installation - each stage
#will record its completion state and if error occurs and another installation is launched,
#it will be able to continue from where it stopped previously - TO BE IMPLEMENTED
installation(){
    print_begin_notice
    install_zypper_packages
    install_zypper_patterns
    create_user
    configure_daemon_kvm
    configure_daemon_libvirt
    configure_daemon_docker
    configure_container_guacamole
    print_finish_notice
}

installation