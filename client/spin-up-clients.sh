#!/bin/bash

PORTS=(3000 3001 3002)
PROJECT_ROOT=<<PATH-TO-ROOT>>

for port in "${PORTS[@]}"
do
  osascript -e "tell application \"Terminal\" to do script \"cd $PROJECT_ROOT && npm start -- --port=$port --host=localhost$port\""
done
