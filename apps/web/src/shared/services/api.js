const API_PREFIX = '/api/v1';

export class ApiClient {
  constructor() {
    this.token = localStorage.getItem('rwa_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('rwa_token', token);
    } else {
      localStorage.removeItem('rwa_token');
    }
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_PREFIX}${endpoint}`, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (e) {
        throw new Error(`Invalid JSON response from server (${response.status} ${response.statusText})`);
      }
    } else {
      const text = await response.text();
      throw new Error(text || `Server returned ${response.status}: Ensure backend API is running on http://localhost:5000`);
    }

    if (!response.ok) {
      throw new Error(data?.error?.message || data?.message || `API error (${response.status})`);
    }

    return data;
  }

  // Auth endpoints
  login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  register(data) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  verifyZkPassport(data) {
    return this.request('/auth/zkpassport/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getMe() {
    return this.request('/auth/me');
  }

  // Domain endpoints
  getAssets() {
    return this.request('/assets');
  }

  getAsset(id) {
    return this.request(`/assets/${encodeURIComponent(id)}`);
  }

  getAssetById(id) {
    return this.getAsset(id);
  }

  submitAssetForVerification(assetId) {
    return this.submitForVerification(assetId);
  }

  registerAsset(data) {
    return this.request('/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateAssetAttributes(id, attributes, reason) {
    return this.request(`/assets/${encodeURIComponent(id)}/attributes`, {
      method: 'PATCH',
      body: JSON.stringify({ attributes, reason }),
    });
  }

  async uploadEvidence(assetId, docType, file) {
    const formData = new FormData();
    formData.append('assetId', assetId);
    formData.append('docType', docType);
    formData.append('file', file);

    const headers = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch('/api/v1/evidence/upload', {
      method: 'POST',
      headers,
      body: formData,
    });

    const contentType = response.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await response.json().catch(() => ({}));
    } else {
      const text = await response.text();
      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('Document file is too large. Maximum supported upload size is 25 MB.');
        }
        throw new Error(`Upload error (${response.status}): ${text.slice(0, 100) || response.statusText}`);
      }
    }

    if (!response.ok) {
      throw new Error(data?.message || data?.error?.message || `File upload failed (${response.status})`);
    }
    return data;
  }

  /**
   * Downloads a stored evidence document as a Blob.
   * The document is fetched with the bearer token (not a public URL) and
   * decrypts server-side; the response echoes the SHA-256 for integrity checks.
   */
  async downloadEvidence(evidenceId) {
    const headers = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(
      `${API_PREFIX}/evidence/${encodeURIComponent(evidenceId)}/download`,
      { headers }
    );

    if (!response.ok) {
      let message = `Failed to download evidence (${response.status})`;
      try {
        const data = await response.json();
        message = data?.error?.message || data?.message || message;
      } catch (e) {
        // Non-JSON error body; keep the default message.
      }
      throw new Error(message);
    }

    const disposition = response.headers.get('content-disposition') || '';
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
    const fileName = match ? decodeURIComponent(match[1]) : `evidence-${evidenceId}`;
    const sha256 = response.headers.get('x-evidence-sha256') || null;
    const blob = await response.blob();

    return { blob, fileName, sha256 };
  }

  submitForVerification(assetId) {
    return this.request(`/assets/${encodeURIComponent(assetId)}/submit-verification`, {
      method: 'POST',
    });
  }

  getAssetTypes() {
    return this.request('/asset-types');
  }

  getAssetType(key, version = 1) {
    return this.request(`/asset-types/${encodeURIComponent(key)}?version=${version}`);
  }

  defineAssetType(data) {
    return this.request('/asset-types', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  deprecateAssetType(key, version = 1, reason) {
    return this.request(`/asset-types/${encodeURIComponent(key)}/deprecate`, {
      method: 'POST',
      body: JSON.stringify({ version, reason }),
    });
  }

  getTokens() {
    return this.request('/tokens');
  }

  getTransfers() {
    return this.request('/transfers');
  }

  getAuditTrail(entityId) {
    const query = entityId ? `?entityId=${encodeURIComponent(entityId)}` : '';
    return this.request(`/audit/trail${query}`);
  }

  getExplorer() {
    return this.request('/audit/explorer');
  }

  publicVerify(tokenId) {
    return this.request(`/tokens/public-verify/${encodeURIComponent(tokenId)}`);
  }

  // Phase 1: Participants & Identity
  getParticipants() {
    return this.request('/participants');
  }

  registerParticipant(data) {
    return this.request('/participants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateKycStatus(id, kycStatus, reason, expiryDate) {
    return this.request(`/participants/${encodeURIComponent(id)}/kyc`, {
      method: 'PATCH',
      body: JSON.stringify({ kycStatus, reason, expiryDate }),
    });
  }

  setLimits(id, maxHoldingBps, maxTransferPaise, reason) {
    return this.request(`/participants/${encodeURIComponent(id)}/limits`, {
      method: 'PATCH',
      body: JSON.stringify({ maxHoldingBps, maxTransferPaise, reason }),
    });
  }

  suspendParticipant(id, reason) {
    return this.request(`/participants/${encodeURIComponent(id)}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  reinstateParticipant(id, reason) {
    return this.request(`/participants/${encodeURIComponent(id)}/reinstate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  addToBlacklist(id, reason) {
    return this.request(`/participants/${encodeURIComponent(id)}/blacklist`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  removeFromBlacklist(id, reason) {
    return this.request(`/participants/${encodeURIComponent(id)}/blacklist`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  }

  uploadKycDoc(id, doc) {
    return this.request(`/participants/${encodeURIComponent(id)}/kyc-docs`, {
      method: 'POST',
      body: JSON.stringify(doc),
    });
  }

  // Phase 1: Identity Admin
  getAdminUsers() {
    return this.request('/identity-admin/users');
  }

  createAdminUser(data) {
    return this.request('/identity-admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateUserStatus(id, status, reason) {
    return this.request(`/identity-admin/users/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  }

  getAdminOrgs() {
    return this.request('/identity-admin/orgs');
  }

  // Verification Audit APIs
  getVerificationCases() {
    return this.request('/verification/cases');
  }

  recordVerificationCheck(caseId, checkKey, result, notes, sourceRef) {
    return this.request(`/verification/cases/${encodeURIComponent(caseId)}/checks`, {
      method: 'POST',
      body: JSON.stringify({ checkKey, result, notes, sourceRef }),
    });
  }

  decideVerification(caseId, decision, reasonCode, reasonText) {
    return this.request(`/verification/cases/${encodeURIComponent(caseId)}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision, reasonCode, reasonText }),
    });
  }

  getRegistryCapabilities() {
    return this.request('/verification/registries');
  }

  runRegistryCheck(caseId, payload) {
    return this.request(`/verification/cases/${encodeURIComponent(caseId)}/registry-check`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Valuation APIs
  getValuations() {
    return this.request('/valuation');
  }

  proposeValuation(data) {
    return this.request('/valuation/propose', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  approveValuation(id) {
    return this.request(`/valuation/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
    });
  }

  // Token APIs
  mintToken(data) {
    return this.request('/tokens/mint', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getTokenHolders(id) {
    return this.request(`/tokens/${encodeURIComponent(id)}/holders`);
  }

  // Transfer APIs
  proposeTransfer(data) {
    return this.request('/transfers/propose', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  evaluateTransfer(data) {
    return this.request('/transfers/evaluate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  executeTransfer(id) {
    return this.request(`/transfers/${encodeURIComponent(id)}/execute`, {
      method: 'POST',
    });
  }

  cancelTransfer(id, reason) {
    return this.request(`/transfers/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      body: JSON.stringify(reason ? { reason } : {}),
    });
  }

  // Lifecycle APIs
  freezeAsset(assetId, reasonText) {
    return this.request('/lifecycle/freeze', {
      method: 'POST',
      body: JSON.stringify({ assetId, reasonText }),
    });
  }

  unfreezeAsset(assetId, reasonText) {
    return this.request('/lifecycle/unfreeze', {
      method: 'POST',
      body: JSON.stringify({ assetId, reasonText }),
    });
  }

  retireAsset(assetId, reasonCode, reasonText) {
    return this.request('/lifecycle/retire', {
      method: 'POST',
      body: JSON.stringify({ assetId, reasonCode, reasonText }),
    });
  }
}

export const api = new ApiClient();
