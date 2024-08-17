#!/usr/bin/env bash

###############################
#       env variables
###############################

#Environmental variables - paths to files storing installation logs and dependencies names to be installed
readonly LOGS_FILE="./logs/cherry-install/"$(date +%d-%m-%y_%H-%M-%S)".txt"
readonly ZYPPER_PACKAGES="./dependencies/zypper_packages.txt"
readonly ZYPPER_PATTERNS="./dependencies/zypper_patterns.txt"

###############################
#   non-installation functions
###############################

#Force script to exit on ERR occurence
set -e

#Error handler to call on ERR occurence and print an error message
error_handler(){
    echo "An error occured! Error code: $?"
    echo -e "See the installation_logs.txt file for specific information.\n"
}
trap "error_handler" ERR

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

#Zypper repos refresh and package installation
install_zypper_packages(){
    read_file "$ZYPPER_PACKAGES"
    index=1
    echo "[Stage I] - Zypper packages installation"
    echo -n "["$index"] Refreshing zypper repositories: "
    zypper -n refresh >> "$LOGS_FILE" 2>&1 #/dev/null 2>&1
    echo 'OK'
    for line in "${packages[@]}"; do
        clean_line=$(echo "$line" | tr -cd '[:alnum:][=-=]')
        ((index++))
        echo -n "["$index"] Installing "$clean_line": "
        zypper -n install -t package "$clean_line" >> "$LOGS_FILE" 2>&1  #/dev/null 2>&1
        echo 'OK'
    done
    echo ""
}

install_zypper_patterns(){
    read_file "$ZYPPER_PATTERNS"
    index=1
    echo "[Stage II] - Zypper patterns installation"
    for line in "${packages[@]}"; do
        clean_line=$(echo "$line" | tr -cd '[:alnum:][=_=]')
        echo -n "["$index"] Installing "$clean_line": "
        ((index++))
        zypper -n install -t pattern "$clean_line" >> "$LOGS_FILE" 2>&1  #/dev/null 2>&1
        echo 'OK'
    done
    echo ""
}

create_user(){
    echo -n '[i] Creating CherryWorker system user: '
    useradd -r -M -s '/usr/bin/false' -c 'Cherry-VM-Manager system user' 'CherryWorker'
    echo 'OK'
    echo -n '[i] Creating CherryWorker home directory: '
    mkdir /home/CherryWorker
    chown CherryWorker:users /home/CherryWorker
    chmod 700 /home/CherryWorker
    echo 'OK'
    echo -n '[i] Adding CherryWorker to system groups: '
    usermod -a -G docker,libvirt CherryWorker
    echo 'OK'
    echo ""
}

configure_daemon_kvm(){
    #check for cpu manufacturer and nested virtualization support - available if turned on in BIOS first
    cpu_model=$(grep "model name" /proc/cpuinfo -m 1 | awk -F: '{print $2}';)
    if echo "$cpu_model" | grep -q "Intel"; then
        cpu_producer='intel'
        if (grep -q "vmx" /proc/cpuinfo); then
            nested_support=true
        fi
    elif echo "$cpu_model" | grep -q "AMD"; then
        cpu_producer='amd'
        if (grep -q "svm" /proc/cpuinfo); then
            nested_support=true
        fi
    else
        echo "Unrecognized CPU, cannot proceed with KVM configuration." > "$LOGS_FILE" 
        exit 125 
    fi
    nested_state=$(cat /sys/module/kvm_"$cpu_producer"/parameters/nested)
    #allow to turn nested virtualization on during installation for better vm performance
    #check whether nested virtualization was turned on before installation
    if [[ "$nested_support" == true ]]; then
        if [[ "$nested_state" != 'Y' ]]; then
            read -p "[?] Detected nested virtualization support. Enable? (y/n): " enable_nested
            if [[ "$enable_nested" == 'y' ]]; then
                modprobe -r kvm_"$cpu_producer"
                modprobe kvm_"$cpu_producer" nested=1 #reload kvm kernel module with nv enabled
                echo "options kvm_intel nested=1" > "/etc/modprobe.d/kvm.conf"
                echo "[i] Nested virtualization enabled."
            else
                echo "[i] Nested virtualization not enabled."
            fi
        else
            echo "[i] Nested virtualization enabled prior to installation. Settings have not been modified."
        fi
    fi
    echo ""
}

configure_daemon_libvirt(){
    echo -n "[i] Enabling libvirt monolithic daemon to run on startup: "
    systemctl enable libvirtd.service >> "$LOGS_FILE" 2>&1 #Test for ERR throwing after fixing the error_handler() trap
    echo 'OK'
    echo -n "[i] Starting libvirt monolithic daemon: "
    systemctl start libvirtd.service >> "$LOGS_FILE" 2>&1
    echo 'OK' #Test for ERR throwing after fixing the error_handler() trap
    echo -n "[i] Creating directory structure (/opt/libvirt/cherry-vm-manager) and copying virtual infrastructure .xml files: "
    mkdir -p /opt/libvirt/cherry-vm-manager
    cp -r ../libvirt/. /opt/libvirt/cherry-vm-manager
    echo 'OK'
    echo ""
}

configure_daemon_docker(){
    echo -n '[i] Enabling docker daemon to run on startup: '
    systemctl enable docker.service >> "$LOGS_FILE" 2>&1 #Test for ERR throwing after fixing the error_handler() trap
    echo 'OK'
    echo -n '[i] Starting docker daemon: '
    systemctl start docker.service >> "$LOGS_FILE" 2>&1 #Test for ERR throwing after fixing the error_handler() trap
    echo 'OK'
    echo -n "[i] Creating directory structure (/opt/docker/cherry-vm-manager) and copying docker-compose files: "
    mkdir -p /opt/docker/cherry-vm-manager
    cp -r ../docker/. /opt/docker/cherry-vm-manager
    echo 'OK'
    echo ""
}

configure_container_guacamole(){
    echo -n '[i] Creating initdb.sql SQL script for Apache Guacamole PostgreSQL db: '
    runuser -u CherryWorker -- docker run --rm guacamole/guacamole /opt/guacamole/bin/initdb.sh --postgresql > /opt/docker/cherry-vm-manager/apache-guacamole/initdb/01-initdb.sql
    #Add automatic docker-compose -d startup
    echo 'OK'
    echo ""
}

###############################
#   actual installation
###############################

#Test to ensure that script is run with root priviliges
if (($EUID != 0)); then
    echo "Insufficient priviliges! Please run the script with root rights."
    exit
fi

#Calls for certain functions - parts of the whole environment initialization process

#Parts invoked in one function to allow implementation of stage installation - each stage
#will record its completion state and if error occurs and another installation is launched,
#it will be able to continue from where it stopped previously - TO BE IMPLEMENTED
installation(){
    install_zypper_packages
    install_zypper_patterns
    create_user
    configure_daemon_kvm
    configure_daemon_libvirt
    configure_daemon_docker
    configure_container_guacamole
}

#Begin installation
#installation
configure_daemon_libvirt
