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

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || data?.message || 'API request failed');
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
}

export const api = new ApiClient();
