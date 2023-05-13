#!/bin/bash

PORTS=(3000 3001 3002 3003 3004)
SIDE_CAR_PORTS=(4000 4001 4002 4003 4004) 
PROJECT_ROOT=<<PATH-TO-CLIENT>>

for ((i=0; i<${#PORTS[@]}; i++)); do
  osascript -e "tell application \"Terminal\" to do script \"cd $PROJECT_ROOT && npm start -- --sidecar=${SIDE_CAR_PORTS[$i]} --port=${PORTS[$i]} --host=node$i\""
done