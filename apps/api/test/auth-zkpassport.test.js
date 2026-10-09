import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';

async function requestApp(method, path, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    import('http').then(({ createServer }) => {
      const server = createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        const targetUrl = `http://127.0.0.1:${port}${path}`;

        fetch(targetUrl, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
        })
          .then(async (res) => {
            const json = await res.json().catch(() => null);
            server.close();
            resolve({ status: res.status, ok: res.ok, body: json });
          })
          .catch((err) => {
            server.close();
            reject(err);
          });
      });
    });
  });
}

describe('ZKPassport & Real User Registration Flow', () => {
  const uniqueId = Date.now().toString(36);
  const testEmail = `issuer.${uniqueId}@consortium-node.io`;
  const testPassword = 'SecureSecretPass@123';
  const testNullifier = `0xnullifier_${uniqueId}_${Math.random().toString(16).slice(2)}`;

  it('Verifies ZKPassport cryptographic proof and generates valid receipt', async () => {
    const res = await requestApp('POST', '/api/v1/auth/zkpassport/verify', {
      body: {
        nullifier: testNullifier,
        nationality: 'IND',
        documentType: 'PASSPORT',
        ageOver18: true,
        sanctionsChecked: true,
        proof: { pi_a: ['0x1'], pi_b: [['0x2']], pi_c: ['0x3'] },
        publicSignals: ['0x123', '0x456'],
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.valid, true);
    assert.equal(res.body.data.nationality, 'IND');
    assert.equal(res.body.data.nullifier, testNullifier);
    assert.ok(res.body.data.proofHash.startsWith('0x'));
    assert.equal(res.body.data.verificationStatus, 'VERIFIED_ON_CHAIN');
  });

  it('Registers a new user and anchors ZK-KYC participant directly on blockchain', async () => {
    const res = await requestApp('POST', '/api/v1/auth/register', {
      body: {
        name: `Acme Real Estate Holdings ${uniqueId}`,
        email: testEmail,
        password: testPassword,
        role: 'ISSUER',
        jurisdiction: 'IND',
        zkPassport: {
          proofHash: `0xzk_proof_${uniqueId}`,
          nullifier: testNullifier,
          nationality: 'IND',
          documentType: 'PASSPORT',
          issuerAuthority: 'ICAO-PKD-CSCA-IND',
          ageOver18: true,
          sanctionsChecked: true,
        },
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token, 'Must return JWT token');
    assert.equal(res.body.data.user.email, testEmail.toLowerCase());
    assert.equal(res.body.data.user.role, 'ISSUER');
    assert.ok(res.body.data.participant, 'Must create participant record');
    assert.equal(res.body.data.participant.kycStatus, 'APPROVED', 'ZK-KYC should be immediately approved on-chain');
    assert.equal(res.body.data.participant.zkNullifier, testNullifier);
  });

  it('Allows the newly registered user to authenticate via standard /login endpoint', async () => {
    const res = await requestApp('POST', '/api/v1/auth/login', {
      body: {
        email: testEmail,
        password: testPassword,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.email, testEmail.toLowerCase());
    assert.equal(res.body.data.user.role, 'ISSUER');
  });

  it('Prevents duplicate registration with the same ZKPassport nullifier (Sybil protection)', async () => {
    const res = await requestApp('POST', '/api/v1/auth/zkpassport/verify', {
      body: {
        nullifier: testNullifier,
        nationality: 'IND',
      },
    });

    assert.equal(res.status, 409, 'Must reject duplicate nullifier with 409 conflict');
  });

  it('Prevents duplicate account registration with existing email', async () => {
    const res = await requestApp('POST', '/api/v1/auth/register', {
      body: {
        name: 'Another User',
        email: testEmail,
        password: testPassword,
        role: 'INVESTOR',
      },
    });

    assert.equal(res.status, 409, 'Must reject duplicate email with 409 conflict');
  });
});
