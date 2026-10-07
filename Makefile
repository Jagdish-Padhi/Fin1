.PHONY: help dev dev-api dev-worker dev-web test lint seed fixtures network-up network-down docker-up docker-down

help:
	@echo "EkamVistar RWA Platform - Development Commands"
	@echo "  make dev          - Run Web, API, and Worker concurrently"
	@echo "  make dev-api      - Run API server"
	@echo "  make dev-web      - Run Web UI"
	@echo "  make seed         - Seed database with 6 orgs and demo roles"
	@echo "  make fixtures     - Run state-forcing fixture generator"
	@echo "  make docker-up    - Start Postgres, Redis, and MinIO containers"
	@echo "  make network-up   - Start 6-org Fabric network"
	@echo "  make network-down - Teardown Fabric network"

dev:
	pnpm dev:all

dev-api:
	pnpm dev:api

dev-worker:
	pnpm dev:worker

dev-web:
	pnpm dev

test:
	pnpm test

lint:
	pnpm lint

seed:
	node db/seeds/seed.js

fixtures:
	node tools/fixtures/fixture-runner.js

docker-up:
	docker compose -f infra/docker-compose.yml up -d postgres redis minio

docker-down:
	docker compose -f infra/docker-compose.yml down

network-up:
	bash network/scripts/bootstrap.sh

network-down:
	bash network/scripts/teardown.sh
