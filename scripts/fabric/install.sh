#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${FABRIC_DIR:-$HOME/.fabric-samples}"

mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR"

if [ ! -f install-fabric.sh ]; then
  echo "Downloading install-fabric.sh..."
  curl -sSL https://cdn.jsdelivr.net/gh/hyperledger/fabric@main/scripts/install-fabric.sh -o install-fabric.sh || \
  curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh -o install-fabric.sh
  chmod +x install-fabric.sh
fi

echo "Installing Hyperledger Fabric 2.5.16 and Fabric CA 1.5.17 into $TARGET_DIR..."
./install-fabric.sh -f 2.5.16 -c 1.5.17 docker binary samples

echo "Fabric installation complete!"
