# Phase Contract Specification Template

## 1. Scope & Ownership
- **Phase Number**: Phase N
- **Phase Title**: [Title]
- **Chaincode Contract**: [ContractName.ts]
- **API Module**: `apps/api/src/modules/[module-name]`
- **Frontend Module**: `apps/web/src/modules/[feature-name]`

## 2. Chaincode Interface
### Transactions (Write)
- `functionName(args...) -> ReturnType`
### Queries (Read)
- `queryName(args...) -> ReturnType`

## 3. REST API Endpoints
- `POST /api/v1/...`
- `GET /api/v1/...`

## 4. On-Chain Events Emitted
- `EventName: { payloadFields }`

## 5. Database Tables & Projections
- Read model projection schemas
