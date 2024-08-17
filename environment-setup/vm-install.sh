#!/usr/bin/env bash

###############################
#       env variables
###############################

#Environmental variables - paths to files storing installation logs and dependencies names to be installed
readonly LOGS_FILE="./logs/vm-install/"$(date +%d-%m-%y_%H-%M-%S)".txt"