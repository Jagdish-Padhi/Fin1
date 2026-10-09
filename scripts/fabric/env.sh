#!/usr/bin/env bash
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export REPO="$REPO_ROOT"

if [ -z "${FABRIC_HOME:-}" ]; then
  if [ -d "$HOME/.fabric-samples/fabric-samples/test-network" ]; then
    export FABRIC_HOME="$HOME/.fabric-samples/fabric-samples"
  elif [ -d "$HOME/.fabric-samples/test-network" ]; then
    export FABRIC_HOME="$HOME/.fabric-samples"
  elif [ -d "$HOME/fabric-samples/test-network" ]; then
    export FABRIC_HOME="$HOME/fabric-samples"
  elif [ -d "$REPO_ROOT/fabric-samples/test-network" ]; then
    export FABRIC_HOME="$REPO_ROOT/fabric-samples"
  else
    export FABRIC_HOME="$HOME/.fabric-samples/fabric-samples"
  fi
fi

export PATH="$FABRIC_HOME/bin:$PATH"
export FABRIC_CFG_PATH="$FABRIC_HOME/config"
export CHANNEL_NAME="${CHANNEL_NAME:-rwa-channel}"
export CC_NAME="${CC_NAME:-rwa}"
