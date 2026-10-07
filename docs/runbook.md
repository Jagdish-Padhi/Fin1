# Operational Runbook — EkamVistar RWA Platform

## Local Development (Phase 0 Foundation)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Start Services
- **Full Stack Development**:
  ```bash
  pnpm dev:all
  ```
- **API Only**:
  ```bash
  pnpm dev:api
  ```
- **Frontend Only**:
  ```bash
  pnpm dev
  ```
- **Worker Only**:
  ```bash
  pnpm dev:worker
  ```

### 3. Database & Seeding
```bash
# Seed 6 consortium orgs, users with 'Password@123', and participants
node db/seeds/seed.js
```

### 4. State-Forcing Fixture Tool
```bash
# Create an asset directly in VERIFIED state
node tools/fixtures/fixture-runner.js asset --type LAND --state VERIFIED
```

### 5. Health Checks
- API Health: `http://localhost:5000/healthz`
- API Readiness: `http://localhost:5000/readyz`
- Public Verify Passport: Open web interface and click "Public Verify Portal"
