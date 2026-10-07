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
}

export const api = new ApiClient();
