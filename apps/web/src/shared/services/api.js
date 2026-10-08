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

  attachEvidence(assetId, data) {
    return this.request(`/assets/${encodeURIComponent(assetId)}/evidence`, {
      method: 'POST',
      body: JSON.stringify(data),
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

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || data?.error?.message || 'File upload failed');
    }
    return data;
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

  getParticipant(id) {
    return this.request(`/participants/${encodeURIComponent(id)}`);
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

  setInvestorClass(id, investorClass, reason) {
    return this.request(`/participants/${encodeURIComponent(id)}/investor-class`, {
      method: 'PATCH',
      body: JSON.stringify({ investorClass, reason }),
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

  createAdminOrg(data) {
    return this.request('/identity-admin/orgs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Verification Audit APIs
  getVerificationCases() {
    return this.request('/verification/cases');
  }

  getVerificationCase(caseId) {
    return this.request(`/verification/cases/${encodeURIComponent(caseId)}`);
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

  // Valuation APIs
  getValuations() {
    return this.request('/valuation');
  }

  getValuation(id) {
    return this.request(`/valuation/${encodeURIComponent(id)}`);
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

  getTokenTrace(id) {
    return this.request(`/tokens/${encodeURIComponent(id)}/trace`);
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
