#!/bin/bash

#Environmental variables - paths to files storing dependencies names to be installed
ZYPPER_PACKAGES="./packages.txt"

#Force script to exit on ERR occurence
set -e

#Error handler to call on ERR occurence and print an error message
error_handler(){
    echo "An error occured! Error code: $?"
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
install_zypper(){
    read_file "$ZYPPER_PACKAGES"
    index=1

    echo -n "["$index"] Refreshing zypper repositories: "
    zypper -n refresh > /dev/null 2>&1
    echo 'OK'

    for line in "${packages[@]}"; do
        clean_line=$(echo "$line" | tr -cd '[:alnum:][=-=]')
        ((index++))
        echo -n "["$index"] Installing "$clean_line": "
        zypper -n install "$clean_line" > /dev/null 2>&1
        echo 'OK'
    done
}

#Test to ensure that script is run with root priviliges
if (($EUID != 0)); then
    echo "Insufficient priviliges! Please run the script with root rights."
    exit
fi

#Calls for certain functions - parts of the whole environment initialization process
install_zypper
