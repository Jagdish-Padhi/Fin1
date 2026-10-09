#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"

if [ -d "$FABRIC_HOME/test-network" ]; then
  echo "===> Taking down Fabric network..."
  cd "$FABRIC_HOME/test-network"
  ./network.sh down
fi

echo "===> Cleaning up .fabric wallets and generated profiles..."
rm -rf "$REPO/.fabric/wallets" "$REPO/.fabric/identity-map.json" "$REPO/.fabric/connection.json"

echo "===> Fabric network is DOWN."
