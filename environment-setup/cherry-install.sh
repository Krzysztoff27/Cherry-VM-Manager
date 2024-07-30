#!/usr/bin/env bash

#Environmental variables - paths to files storing installation logs and dependencies names to be installed
readonly LOGS_FILE="./logs/installation_logs_"$(date +%d-%m-%y_%H-%M-%S)".txt"
readonly ZYPPER_PACKAGES="./dependencies/zypper_packages.txt"
readonly ZYPPER_PATTERNS="./dependencies/zypper_patterns.txt"

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

#Functions performing installation 
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

configure_kvm(){
    cpu_model=$(grep "model name" /proc/cpuinfo -m 1 | awk -F: '{print $2}';)
    if echo "$cpu_model" | grep -q "Intel"; then
        cpu_producer='intel'
    elif echo "$cpu_model" | grep -q "AMD"; then
        cpu_producer='amd'
    else
        echo "Unrecognized CPU, cannot proceed with KVM configuration." > "$LOGS_FILE" 
          exit 125 
    fi
    nested_support=$(cat /sys/module/kvm_"$cpu_producer"/parameters/nested)
    if [[ "$nested_support" == 'Y' ]]; then
        read -p "[?] Detected nested virtualization support. Enable? (y/n): " enable_nested
        if [[ "$enable_nested" == 'y' ]]; then
            modprobe -r kvm_"$cpu_producer"
            modprobe kvm_"$cpu_producer" nested=1
            echo "options kvm_intel nested=1" >> "/etc/modprobe.d/kvm.conf"
            echo "[i] Nested virtualization enabled"
        else
            echo "[i] Nested virtualization not enabled"
        fi
    fi
    echo ""
}

#Test to ensure that script is run with root priviliges
if (($EUID != 0)); then
    echo "Insufficient priviliges! Please run the script with root rights."
    exit
fi

#Calls for certain functions - parts of the whole environment initialization process
install_zypper_packages
install_zypper_patterns
configure_kvm