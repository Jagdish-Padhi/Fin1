import { toFriendlyErrorMessage } from '../utils/error-messages.js';

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

    let response;
    try {
      response = await fetch(`${API_PREFIX}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (e) {
      throw new Error(toFriendlyErrorMessage(e));
    }

    const contentType = response.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (e) {
        throw new Error(
          toFriendlyErrorMessage(e, 'Unexpected server response. Please try again.')
        );
      }
    } else {
      const text = await response.text();
      throw new Error(
        toFriendlyErrorMessage(
          text ? `Server error (${response.status}): ${text.slice(0, 120)}` : '',
          'Cannot reach the server. Check your connection and try again.'
        )
      );
    }

    if (!response.ok) {
      const serverMessage = data?.error?.message || data?.message || '';
      const err = new Error(
        toFriendlyErrorMessage(
          serverMessage ? `HTTP ${response.status}: ${serverMessage}` : `HTTP ${response.status}`,
          'Request failed. Please try again.'
        )
      );
      err.status = response.status;
      throw err;
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

    let response;
    try {
      response = await fetch('/api/v1/evidence/upload', {
        method: 'POST',
        headers,
        body: formData,
      });
    } catch (e) {
      throw new Error(toFriendlyErrorMessage(e));
    }

    const contentType = response.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await response.json().catch(() => ({}));
    } else {
      const text = await response.text();
      if (!response.ok) {
        throw new Error(
          toFriendlyErrorMessage(`HTTP ${response.status}: ${text.slice(0, 120)}`, 'Document upload failed. Please try again.')
        );
      }
    }

    if (!response.ok) {
      const serverMessage = data?.message || data?.error?.message || '';
      throw new Error(
        toFriendlyErrorMessage(
          serverMessage ? `HTTP ${response.status}: ${serverMessage}` : `HTTP ${response.status}`,
          'Document upload failed. Please try again.'
        )
      );
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

    let response;
    try {
      response = await fetch(
        `${API_PREFIX}/evidence/${encodeURIComponent(evidenceId)}/download`,
        { headers }
      );
    } catch (e) {
      throw new Error(toFriendlyErrorMessage(e));
    }

    if (!response.ok) {
      let serverMessage = '';
      try {
        const data = await response.json();
        serverMessage = data?.error?.message || data?.message || '';
      } catch (e) {
        // Non-JSON error body; fall through to the friendly default.
      }
      throw new Error(
        toFriendlyErrorMessage(
          serverMessage ? `HTTP ${response.status}: ${serverMessage}` : `HTTP ${response.status}`,
          'Could not download this document. Please try again.'
        )
      );
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

  runIntegrityCheck(caseId) {
    return this.request(`/verification/cases/${encodeURIComponent(caseId)}/integrity-check`, { method: 'POST' });
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

  getValuationIndication(assetId, method, inputs = {}) {
    return this.request('/valuation/indication', {
      method: 'POST',
      body: JSON.stringify({ assetId, method, ...inputs }),
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

  redeemAsset(assetId, reasonText) {
    return this.request('/lifecycle/redeem', {
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
