#!/bin/sh
set -e
node refresher.js &
REFRESHER_PID=$!
node server.js &
SERVER_PID=$!
trap "kill -TERM $REFRESHER_PID $SERVER_PID 2>/dev/null" TERM INT
# If either process dies, exit so k8s restarts the whole pod.
wait -n "$REFRESHER_PID" "$SERVER_PID"
EXIT=$?
kill -TERM "$REFRESHER_PID" "$SERVER_PID" 2>/dev/null || true
exit $EXIT
