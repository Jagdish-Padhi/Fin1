#!/usr/bin/env bash
set -euo pipefail

echo "Stopping and tearing down Fabric containers..."
docker compose -f network/docker-compose-fabric.yml down -v --remove-orphans || true
echo "Network cleaned."
