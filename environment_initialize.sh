#!/bin/bash
set -e #Force exit on ERR occurence
error_handler(){
    echo "An error occured! Error code: $?"
}
trap "error_handler" ERR
#Ensure that script is run as root for sufficient priviliges
if (($EUID != 0)); then
    echo "Please run the script as root!"
    exit
fi
#repos refresh
echo -n "[1] Refreshing zypper repositories: "
zypper -n ref > /dev/null 2>&1
echo "OK"
#docker docker-compose installation
echo -n "[2] Installing docker and docker-compose: "
zypper -n in docker docker-compose > /dev/null 2>&1
echo "OK"
