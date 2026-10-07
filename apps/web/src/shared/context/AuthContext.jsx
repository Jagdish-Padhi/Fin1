import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

export const DEMO_ROLES = [
  { role: 'ADMINISTRATOR', email: 'admin@assetrust.io', label: 'Administrator (AsseTrust)', color: 'bg-[#0F2A43]/10 text-[#0F2A43] border-[#0F2A43]/20' },
  { role: 'ISSUER', email: 'issuer@originator.com', label: 'Issuer (Origination Desk)', color: 'bg-[#1F5A7A]/10 text-[#1F5A7A] border-[#1F5A7A]/20' },
  { role: 'VERIFIER', email: 'verifier@auditfirm.com', label: 'Verifier (TUV / SGS Quality)', color: 'bg-[#18794E]/10 text-[#18794E] border-[#18794E]/20' },
  { role: 'VALUER', email: 'valuer@valuationpartners.com', label: 'Valuer (Institutional Appraiser)', color: 'bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/20' },
  { role: 'COMPLIANCE', email: 'compliance@regulatory.gov.in', label: 'Compliance (Regulator)', color: 'bg-[#A16207]/10 text-[#A16207] border-[#A16207]/20' },
  { role: 'INVESTOR', email: 'investor@capitalfund.com', label: 'Investor (Capital Fund)', color: 'bg-[#1F5A7A]/10 text-[#1F5A7A] border-[#1F5A7A]/20' },
  { role: 'AUDITOR', email: 'auditor@kpmg-audit.com', label: 'Auditor (Consortium Oversight)', color: 'bg-[#0F2A43]/10 text-[#0F2A43] border-[#0F2A43]/20' },
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
