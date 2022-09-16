#!/bin/bash

set -eou pipefail

MODE=${MODE:-'Server'}

echo "[+] Starting on ${MODE} mode"
case "${MODE}" in
  "DEBUG")
    sleep 9999999
    exit 0
    ;;

  "GitHub")
    bash /mnt/github.sh
    ;;

  "Server")
    /usr/local/bin/citizen server
    ;;
esac
