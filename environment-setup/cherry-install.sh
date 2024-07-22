#!/bin/bash

#Environmental variables - paths to files storing installation logs and dependencies names to be installed
readonly LOGS_FILE="./logs/installation_logs.txt"
readonly ZYPPER_PACKAGES="./dependencies/zypper_packages.txt"
readonly PYTHON_PACKAGES="./dependencies/python_packages.txt" #DIRECTORY TO BE CHANGED IN FINAL VERSION

#Force script to exit on ERR occurence
set -e

#Error handler to call on ERR occurence and print an error message
error_handler(){
    echo "An error occured! Error code: $?"
    echo -e "See the installation_logs.txt file for specific information.\n"
}
trap "error_handler" ERR

purge_logs(){
    > "$LOGS_FILE"
}

#Universal function to read dependenies names from a file
read_file(){
    packages=()
    while IFS= read -r line || [[ -n "$line" ]]; do
        packages+=("$line")
    done < "$1"
}

#Functions performing installation 
#Zypper repos refresh and package installation
install_zypper(){
    read_file "$ZYPPER_PACKAGES"
    index=1
    echo "[Stage I] - Zypper packages installation "
    echo -n "["$index"] Refreshing zypper repositories: "
    zypper -n refresh >> "$LOGS_FILE" 2>&1 #/dev/null 2>&1
    echo 'OK'
    for line in "${packages[@]}"; do
        clean_line=$(echo "$line" | tr -cd '[:alnum:][=-=]')
        ((index++))
        echo -n "["$index"] Installing "$clean_line": "
        zypper -n install "$clean_line" >> "$LOGS_FILE" 2>&1  #/dev/null 2>&1
        echo 'OK'
    done
    echo ""
}

install_python(){
    read_file "$PYTHON_PACKAGES"
    index=1
    echo "[Stage II] - Python packages installation"

    #INSERT VIRTUAL ENVIRONMENT INITIALIZATION TO PREVENT VERSION CONFLICTS

    for line in "${packages[@]}"; do
        clean_line=$(echo "$line" | tr -cd '[:alnum:][[]]')
        echo -n "["$index"] Installing "$clean_line": "
        ((index++))
        #insert pip installation
        echo 'OK'
    done
}

#Test to ensure that script is run with root priviliges
if (($EUID != 0)); then
    echo "Insufficient priviliges! Please run the script with root rights."
    exit
fi

#Calls for certain functions - parts of the whole environment initialization process
purge_logs #delete logs from previous installation process
install_zypper
install_python
