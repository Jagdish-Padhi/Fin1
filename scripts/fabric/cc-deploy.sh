#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/env.sh"

echo "===> Bundling chaincode..."
(cd "$REPO/chaincode/rwa" && pnpm build:cc)

echo "===> Deploying chaincode $CC_NAME to channel $CHANNEL_NAME..."
cd "$FABRIC_HOME/test-network"

# Check if deployCCAAS is available
if ./network.sh deployCCAAS -h >/dev/null 2>&1; then
  echo "Deploying via deployCCAAS..."
  ./network.sh deployCCAAS -ccn "$CC_NAME" -ccp "$REPO/chaincode/rwa/build/cc" -cccg "$REPO/network/collections_config.json" -c "$CHANNEL_NAME" || {
    echo "deployCCAAS failed, falling back to deployCC..."
    ./network.sh deployCC -ccn "$CC_NAME" -ccp "$REPO/chaincode/rwa/build/cc" -ccl javascript -cccg "$REPO/network/collections_config.json" -c "$CHANNEL_NAME"
  }
else
  echo "Deploying via deployCC..."
  ./network.sh deployCC -ccn "$CC_NAME" -ccp "$REPO/chaincode/rwa/build/cc" -ccl javascript -cccg "$REPO/network/collections_config.json" -c "$CHANNEL_NAME"
fi

echo "===> Chaincode $CC_NAME deployed successfully!"
