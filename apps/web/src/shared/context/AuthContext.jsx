import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

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
   * Register a new participant account with ZKPassport KYC.
   * Returns the user and participant objects on success.
   */
  const register = async (data) => {
    const res = await api.register(data);
    if (!res?.data?.token || !res?.data?.user) {
      throw new Error('Invalid registration response from server.');
    }
    api.setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  /**
   * Clear session completely.
   */
  const logout = () => {
    api.setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
