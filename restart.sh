#!/bin/bash

PORT=4173

echo "Checking for process on port $PORT..."

# Find process using the port
PID=$(lsof -ti tcp:$PORT)

if [ -n "$PID" ]; then
  echo "Killing process $PID on port $PORT..."
  kill -9 $PID
else
  echo "No process found on port $PORT"
fi

# If -k flag is passed, exit after killing
if [ "$1" == "-k" ]; then
  echo "Kill-only mode. Exiting."
  exit 0
fi

echo "Starting npm preview on port $PORT..."

# Start app in background (detached)
nohup npm run preview -- --port $PORT > preview.log 2>&1 &

echo "App started. Logs: preview.log"
