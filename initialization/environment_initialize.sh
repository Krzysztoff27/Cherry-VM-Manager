#!/bin/bash

#Force exit on ERR occurence
set -e

#Error handler to call on ERR occurence
error_handler(){
    echo "An error occured! Error code: $?"
}
trap "error_handler" ERR

#Zypper repos refresh and package installation
install_packages(){
    packages=()
    index=1

    echo -n "["$index"] Refreshing zypper repositories: "
    zypper -n refresh > /dev/null 2>&1
    echo 'OK'

    while IFS= read -r line || [[ -n "$line" ]]; do
    packages+=("$line")
    done < "$1"

    for line in "${packages[@]}"; do
        clean_line=$(echo "$line" | tr -cd '[:alnum:][=-=]')
        ((index++))
        echo -n "["$index"] Installing "$clean_line": "
        zypper -n install "$clean_line" > /dev/null 2>&1
        echo 'OK'
    done
}

#Ensure that script is run as root for sufficient priviliges
if (($EUID != 0)); then
    echo "Please run the script as root!"
    exit
fi

install_packages "./packages.txt"