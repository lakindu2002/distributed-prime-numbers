#!/bin/bash

PORTS=(3000 3001 3002)
PROJECT_ROOT=<<PATH-TO-ROOT>>

for ((i=0; i<${#PORTS[@]}; i++)); do
  osascript -e "tell application \"Terminal\" to do script \"cd $PROJECT_ROOT && npm start -- --port=${PORTS[$i]} --host=node:${PORTS[$i]}\""
done