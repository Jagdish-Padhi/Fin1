.PHONY: help install up down deploy enroll bootstrap all test smoke ping live

help:
	@echo "EkamVistar Hyperledger Fabric Operations"
	@echo "  make install    - Install Fabric 2.5 and CA binaries & samples"
	@echo "  make up         - Start Fabric network, CAs, CouchDB, and channel"
	@echo "  make down       - Tear down Fabric network and clean wallets"
	@echo "  make deploy     - Bundle chaincode and deploy to channel"
	@echo "  make enroll     - Enroll users and generate identities/wallets"
	@echo "  make bootstrap  - Initialize asset types and seed participants"
	@echo "  make all        - Full up + deploy + enroll + bootstrap pipeline"
	@echo "  make ping       - Quick smoke check evaluating chaincode via FabricGateway"
	@echo "  make smoke      - Run end-to-end 6-persona golden path against Fabric API"
	@echo "  make test       - Run all test suites across the monorepo"

install:
	bash scripts/fabric/install.sh

up:
	bash scripts/fabric/network-up.sh

down:
	bash scripts/fabric/network-down.sh

deploy:
	bash scripts/fabric/cc-deploy.sh

enroll:
	node tools/identity/enroll.mjs

bootstrap:
	node tools/bootstrap/ledger-init.mjs

all: up deploy enroll bootstrap

ping:
	node tools/smoke/ping.mjs

live:
	node tools/smoke/live-fabric-demo.mjs

smoke:
	node tools/smoke/golden-path.mjs

test:
	pnpm -r test
