#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"

if [ ! -d "$FABRIC_HOME/test-network" ]; then
  echo "Error: test-network not found at $FABRIC_HOME/test-network"
  echo "Please run scripts/fabric/install.sh first."
  exit 1
fi

echo "===> Starting Fabric Test Network with CAs, CouchDB, and channel $CHANNEL_NAME..."
cd "$FABRIC_HOME/test-network"
./network.sh up createChannel -c "$CHANNEL_NAME" -ca -s couchdb

echo "===> Adding Org3 to channel $CHANNEL_NAME with CA and CouchDB..."
cd "$FABRIC_HOME/test-network/addOrg3"
./addOrg3.sh up -c "$CHANNEL_NAME" -ca -s couchdb

echo "===> Generating connection profile..."
cd "$REPO"
node scripts/fabric/gen-connection.mjs

echo "===> Fabric network is UP and configured!"
