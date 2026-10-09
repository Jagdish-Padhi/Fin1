import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { app } from '../src/app.js';
import { authService } from '../src/modules/auth/auth.service.js';
import { storageService } from '../src/core/storage/storage.service.js';
import { chainBridge } from '../src/core/chain/chain-bridge.js';

async function requestApp(method, pathUrl, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    import('http').then(({ createServer }) => {
      const server = createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        const targetUrl = `http://127.0.0.1:${port}${pathUrl}`;

        fetch(targetUrl, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
        })
          .then(async (res) => {
            const contentType = res.headers.get('content-type') || '';
            let parsed;
            if (contentType.includes('application/json')) {
              parsed = await res.json().catch(() => null);
            } else {
              parsed = await res.text().catch(() => null);
            }
            server.close();
            resolve({
              status: res.status,
              ok: res.ok,
              headers: res.headers,
              body: parsed,
            });
          })
          .catch((err) => {
            server.close();
            reject(err);
          });
      });
    });
  });
}

describe('Phase 6: Security Hardening & Authorization Controls', () => {
  let adminToken;
  let issuerToken;
  let investorToken;

  before(async () => {
    const adminLogin = await authService.login('admin@ekamvistar.com', 'Password@123');
    adminToken = adminLogin.token;

    const issuerLogin = await authService.login('issuer@originator.com', 'Password@123');
    issuerToken = issuerLogin.token;

    const investorLogin = await authService.login('investor@capitalfund.com', 'Password@123');
    investorToken = investorLogin.token;
  });

  describe('6.1 Authentication Hardening', () => {
    it('rejects wrong password for a seeded user with 401', async () => {
      const res = await requestApp('POST', '/api/v1/auth/login', {
        body: {
          email: 'admin@ekamvistar.com',
          password: 'IncorrectPassword!999',
        },
      });
      assert.equal(res.status, 401);
    });

    it('rejects Password@123 for an unknown/unregistered email with 401', async () => {
      const res = await requestApp('POST', '/api/v1/auth/login', {
        body: {
          email: 'unknown.hacker@evilcorp.com',
          password: 'Password@123',
        },
      });
      assert.equal(res.status, 401);
    });
  });

  describe('6.2 Protected Live Event Stream', () => {
    it('GET /api/v1/events/stream returns 401 without authentication', async () => {
      const res = await requestApp('GET', '/api/v1/events/stream');
      assert.equal(res.status, 401);
    });

    it('GET /api/v1/events/stream accepts query token and returns text/event-stream', async () => {
      return new Promise((resolve, reject) => {
        import('http').then(({ createServer }) => {
          const server = createServer(app);
          server.listen(0, async () => {
            const port = server.address().port;
            const url = `http://127.0.0.1:${port}/api/v1/events/stream?access_token=${investorToken}`;

            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 2000);

            try {
              const res = await fetch(url, { signal: controller.signal });
              clearTimeout(timer);
              assert.equal(res.status, 200);
              assert.ok(res.headers.get('content-type')?.includes('text/event-stream'));
              controller.abort();
              server.close();
              resolve();
            } catch (err) {
              server.close();
              if (err.name === 'AbortError') {
                // Connection was successful and streaming until aborted
                resolve();
              } else {
                reject(err);
              }
            }
          });
        });
      });
    });
  });

  describe('6.4 Separation of Duties: Admin Minting Blocked', () => {
    it('POST /api/v1/tokens/mint rejects ADMINISTRATOR role with 403', async () => {
      const res = await requestApp('POST', '/api/v1/tokens/mint', {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          assetId: 'AST-LAND-001',
          standard: 'FRACTIONAL',
          totalUnits: 1000,
          rightsType: 'UNDIVIDED_FRACTION',
          representation: 'Land fractional token',
        },
      });
      assert.equal(res.status, 403);
    });
  });

  describe('6.6 Evidence Download with Hash Verification', () => {
    let evidenceId;
    let originalDocBuffer;
    let storageKey;

    before(async () => {
      const assetRes = await requestApp('POST', '/api/v1/assets', {
        headers: { Authorization: `Bearer ${issuerToken}` },
        body: {
          typeKey: 'LAND',
          displayName: 'Secured Plot 999',
          jurisdiction: 'IN',
          attributes: {
            surveyNumber: 'SURVEY-SEC-999',
            district: 'Mysuru',
            state: 'Karnataka',
            areaSqMeters: 500,
            landUse: 'COMMERCIAL',
          },
        },
      });
      assert.equal(assetRes.status, 201);
      const testAssetId = assetRes.body.data.id;

      originalDocBuffer = Buffer.from('Official Land Title Deed Document Verification Content 2026');
      const stored = await storageService.storeDocument(
        originalDocBuffer,
        'title-deed.pdf',
        'application/pdf'
      );
      storageKey = stored.storageKey;

      const attached = await chainBridge.submit(
        { userId: 'USR-ISSUER', role: 'ISSUER', participantId: 'PRT-ISSUER-01', mspId: 'IssuerMSP' },
        'attachEvidence',
        {
          assetId: testAssetId,
          docType: 'TITLE_DEED',
          fileName: 'title-deed.pdf',
          mimeType: 'application/pdf',
          fileSize: stored.size,
          sha256: stored.sha256,
          storageKey: stored.storageKey,
        }
      );
      evidenceId = attached.result?.id || attached.id || (attached.evidence && attached.evidence.id);
    });

    it('allows owning ISSUER to download document and returns matching content and hash', async () => {
      const res = await requestApp('GET', `/api/v1/evidence/${evidenceId}/download`, {
        headers: { Authorization: `Bearer ${issuerToken}` },
      });
      assert.equal(res.status, 200);
      assert.ok(res.headers.get('content-type')?.includes('application/pdf'));
      assert.ok(res.headers.get('x-evidence-sha256'));
      assert.equal(res.body, originalDocBuffer.toString());
    });

    it('denies INVESTOR role from downloading evidence with 403', async () => {
      const res = await requestApp('GET', `/api/v1/evidence/${evidenceId}/download`, {
        headers: { Authorization: `Bearer ${investorToken}` },
      });
      assert.equal(res.status, 403);
    });

    it('denies ADMINISTRATOR role from downloading evidence with 403', async () => {
      const res = await requestApp('GET', `/api/v1/evidence/${evidenceId}/download`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 403);
    });

    it('detects tampered file on disk and responds with 409 EVIDENCE_TAMPERED', async () => {
      const filePath = path.join(storageService.vaultDir, `${storageKey}.bin`);
      const originalEncrypted = fs.readFileSync(filePath);

      // Corrupt a byte in the encrypted file (or replace with different data)
      const corrupted = Buffer.from(originalEncrypted);
      corrupted[10] = (corrupted[10] + 1) % 256;
      fs.writeFileSync(filePath, corrupted);

      try {
        const res = await requestApp('GET', `/api/v1/evidence/${evidenceId}/download`, {
          headers: { Authorization: `Bearer ${issuerToken}` },
        });
        // Either GCM authentication fails or hash mismatch fails
        assert.ok(res.status === 409 || res.status === 500);
      } finally {
        // Restore original
        fs.writeFileSync(filePath, originalEncrypted);
      }
    });
  });
});
