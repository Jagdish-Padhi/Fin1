import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

export const DEMO_ROLES = [
  { role: 'ADMINISTRATOR', email: 'admin@ekamvistar.com', label: 'Administrator (EkamVistar)', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  { role: 'ISSUER', email: 'issuer@originator.com', label: 'Issuer (Bharat Agro)', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { role: 'VERIFIER', email: 'verifier@auditfirm.com', label: 'Verifier (TUV / SGS)', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { role: 'VALUER', email: 'valuer@valuationpartners.com', label: 'Valuer (Valuation Partners)', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
  { role: 'COMPLIANCE', email: 'compliance@regulatory.gov.in', label: 'Compliance (Regulatory)', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { role: 'INVESTOR', email: 'investor@capitalfund.com', label: 'Investor (Samriddhi Capital)', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { role: 'AUDITOR', email: 'auditor@kpmg-audit.com', label: 'Auditor (Consortium Audit)', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const initAuth = async () => {
    try {
      if (api.token) {
        const res = await api.getMe();
        setUser(res.data);
      } else {
        // Auto-login as Administrator for default preview
        await switchRole('ADMINISTRATOR');
      }
    } catch (err) {
      console.warn('Auth init failed, logging in as Administrator default');
      await switchRole('ADMINISTRATOR');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    api.setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const switchRole = async (targetRole) => {
    const roleConfig = DEMO_ROLES.find((r) => r.role === targetRole) || DEMO_ROLES[0];
    try {
      const res = await api.login(roleConfig.email, 'Password@123');
      api.setToken(res.data.token);
      setUser(res.data.user);
    } catch (err) {
      console.error(`Failed to switch to role ${targetRole}:`, err);
    }
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, switchRole, logout, roles: DEMO_ROLES }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
