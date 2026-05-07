#!/bin/sh
# busybox sh in Alpine doesn't support `wait -n`, so we poll both PIDs.
# tini (PID 1) handles the signal forwarding; this script just makes sure
# the pod restarts when either child dies.
set -e

node refresher.js &
REFRESHER_PID=$!
node server.js &
SERVER_PID=$!

cleanup() {
  kill -TERM "$REFRESHER_PID" "$SERVER_PID" 2>/dev/null || true
}
trap cleanup TERM INT

while kill -0 "$REFRESHER_PID" 2>/dev/null && kill -0 "$SERVER_PID" 2>/dev/null; do
  sleep 5
done

# One of them died — propagate exit and tear down the survivor.
wait "$REFRESHER_PID" 2>/dev/null
EXIT_R=$?
wait "$SERVER_PID" 2>/dev/null
EXIT_S=$?
cleanup

# Prefer the non-zero exit so the failure reason surfaces in pod logs.
if [ "$EXIT_R" -ne 0 ]; then exit "$EXIT_R"; fi
exit "$EXIT_S"
