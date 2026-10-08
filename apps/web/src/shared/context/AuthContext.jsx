import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

/**
 * Demo consortium identities — used ONLY in the Auth Modal's "quick-fill" section
 * for hackathon demonstration. In production this would be removed.
 */
export const DEMO_ROLES = [
  { role: 'ADMINISTRATOR', email: 'admin@assetrust.io', label: 'Administrator (AsseTrust)', org: 'EkamVistar Platform Operator' },
  { role: 'ISSUER', email: 'issuer@originator.com', label: 'Issuer (Origination Desk)', org: 'Bharat Agro & Infrastructure' },
  { role: 'VERIFIER', email: 'verifier@auditfirm.com', label: 'Verifier (TÜV / SGS Audits)', org: 'TUV / SGS Certification' },
  { role: 'VALUER', email: 'valuer@valuationpartners.com', label: 'Valuer (Institutional Appraiser)', org: 'Certified Appraisal Partners' },
  { role: 'COMPLIANCE', email: 'compliance@regulatory.gov.in', label: 'Compliance (Regulator)', org: 'National Asset Governance' },
  { role: 'INVESTOR', email: 'investor@capitalfund.com', label: 'Investor (Capital Fund)', org: 'Samriddhi Capital Fund' },
  { role: 'AUDITOR', email: 'auditor@kpmg-audit.com', label: 'Auditor (Consortium Oversight)', org: 'Statutory Audit Consortium' },
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: try to restore session from saved token
  useEffect(() => {
    const restoreSession = async () => {
      try {
        if (api.token) {
          const res = await api.getMe();
          if (res?.data) {
            setUser(res.data);
          } else {
            // Token is invalid/expired — clear it
            api.setToken(null);
          }
        }
      } catch (err) {
        // Token expired or invalid — silently clear
        api.setToken(null);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  /**
   * Authenticate with email + password.
   * Returns the user object on success.
   */
  const login = async (email, password) => {
    const res = await api.login(email, password);
    if (!res?.data?.token || !res?.data?.user) {
      throw new Error('Invalid authentication response from server.');
    }
    api.setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  /**
   * Clear session completely.
   */
  const logout = () => {
    api.setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, roles: DEMO_ROLES }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
