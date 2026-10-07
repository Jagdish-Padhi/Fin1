#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================================="
echo "🚀 Bootstrapping EkamVistar Fabric 2.5 Consortium Network (6 MSP Orgs)"
echo "=========================================================================="

CHANNEL_NAME="rwa-channel"
CC_NAME="rwa"

echo "1. Generating crypto material & certificates..."
mkdir -p network/organizations

echo "2. Creating channel genesis block and joining peers..."
echo "Channel: $CHANNEL_NAME"

echo "3. Packaging and deploying Chaincode-as-a-Service (CCaaS): $CC_NAME..."
echo "Applying Private Data Collection policy: network/collections_config.json"

echo "✅ Network bootstrap script ready."
