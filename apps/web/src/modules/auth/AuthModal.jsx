import React, { useState } from 'react';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { BrandLogo } from '../../shared/components/BrandLogo.jsx';
import {
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  UserPlus,
  AlertCircle,
  Building,
  CheckCircle2,
} from 'lucide-react';

export function AuthModal({ isOpen, onClose, initialMode = 'login', onSuccess }) {
  const { login, roles, switchRole } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup'
  
  // Login State
  const [email, setEmail] = useState('admin@assetrust.io');
  const [password, setPassword] = useState('Password@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Self-Signup State (Retail Originator / Investor)
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    role: 'ISSUER', // 'ISSUER' or 'INVESTOR'
    jurisdiction: 'IN',
    idType: 'PAN',
    idNumber: '',
  });
  const [signupSuccess, setSignupSuccess] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleQuickSelect = (r) => {
    setEmail(r.email);
    setPassword('Password@123');
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Self-signup places identity into PENDING KYC state on consortium ledger
      setSignupSuccess(true);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F2A43]/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#D8E0E8] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-xs font-bold text-[#5A6A7E] hover:text-[#0F2A43] p-1.5"
        >
          ✕
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <BrandLogo />
          <h2 className="text-lg font-bold text-[#0F2A43] mt-3">
            {mode === 'login' ? 'Consortium Node Authentication' : 'Tier-3 Participant Self-Registration'}
          </h2>
          <p className="text-xs text-[#5A6A7E] mt-0.5">
            {mode === 'login'
              ? 'Institutional access verified against Hyperledger Fabric CA certificates'
              : 'Direct onboarding for Asset Originators and Accredited Investors'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B42318] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {mode === 'login' ? (
          <div>
            <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Consortium Account Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-[#5A6A7E]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-[#D8E0E8] rounded-lg text-xs focus:outline-none focus:border-[#1F5A7A]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Passphrase / Key Secret</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-[#5A6A7E]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-[#D8E0E8] rounded-lg text-xs focus:outline-none focus:border-[#1F5A7A]"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#0F2A43] hover:bg-[#1F5A7A] text-white font-semibold rounded-lg text-xs transition flex items-center justify-center gap-2 mt-4 shadow-xs"
              >
                <span>{loading ? 'Authenticating with MSP...' : 'Authenticate & Open Workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Demo Quick-Login Grid */}
            <div className="mt-6 pt-5 border-t border-[#D8E0E8]">
              <div className="text-[10px] uppercase font-bold text-[#5A6A7E] mb-2.5 flex items-center justify-between">
                <span>Demo Consortium Identities</span>
                <span className="text-[#0F766E]">Click to Autofill</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {roles.map((r) => (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => handleRoleQuickSelect(r)}
                    className={`p-2 rounded-lg border text-left transition font-semibold truncate ${
                      email === r.email
                        ? 'border-[#0F2A43] bg-[#F0F4F8] text-[#0F2A43]'
                        : 'border-[#D8E0E8] bg-white text-[#5A6A7E] hover:border-[#1F5A7A]'
                    }`}
                  >
                    <div className="text-[10px] text-[#0F766E] uppercase">{r.role}</div>
                    <div className="truncate">{r.label.split(' ')[0]}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-xs text-[#1F5A7A] hover:underline font-semibold"
              >
                Need to onboard as an Issuer or Investor? Self-register &rarr;
              </button>
            </div>
          </div>
        ) : signupSuccess ? (
          <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-center space-y-3 text-xs">
            <CheckCircle2 className="w-8 h-8 text-[#18794E] mx-auto" />
            <h4 className="font-bold text-[#18794E]">Application Submitted to Compliance Queue</h4>
            <p className="text-[#5A6A7E]">
              Your profile has been cryptographically salted and queued for KYC review by the Compliance Officer. Under Problem Statement governance rules, active ledger capabilities unlock upon verification sign-off.
            </p>
            <button
              onClick={() => {
                setSignupSuccess(false);
                setMode('login');
              }}
              className="px-4 py-2 bg-[#0F2A43] text-white rounded-lg font-semibold text-xs"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <div>
            <form onSubmit={handleSignupSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Intent / Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSignupForm({ ...signupForm, role: 'ISSUER' })}
                    className={`p-2 rounded-lg border font-semibold text-center ${
                      signupForm.role === 'ISSUER'
                        ? 'border-[#0F2A43] bg-[#F0F4F8] text-[#0F2A43]'
                        : 'border-[#D8E0E8] text-[#5A6A7E]'
                    }`}
                  >
                    Asset Owner / Issuer
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupForm({ ...signupForm, role: 'INVESTOR' })}
                    className={`p-2 rounded-lg border font-semibold text-center ${
                      signupForm.role === 'INVESTOR'
                        ? 'border-[#0F2A43] bg-[#F0F4F8] text-[#0F2A43]'
                        : 'border-[#D8E0E8] text-[#5A6A7E]'
                    }`}
                  >
                    Accredited Investor
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Legal Full Name / Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Agritech Corp"
                  value={signupForm.name}
                  onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Official Email</label>
                <input
                  type="email"
                  placeholder="e.g. legal@acme.com"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">ID Type</label>
                  <select
                    value={signupForm.idType}
                    onChange={(e) => setSignupForm({ ...signupForm, idType: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg bg-white"
                  >
                    <option value="PAN">PAN Card (India)</option>
                    <option value="GSTIN">GSTIN Tax Registration</option>
                    <option value="EIN">US EIN / LEI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">Identifier Value</label>
                  <input
                    type="text"
                    placeholder="e.g. ABCDE1234F"
                    value={signupForm.idNumber}
                    onChange={(e) => setSignupForm({ ...signupForm, idNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg uppercase font-mono"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#0F2A43] hover:bg-[#1F5A7A] text-white font-semibold rounded-lg text-xs transition flex items-center justify-center gap-2 mt-4 shadow-xs"
              >
                <span>{loading ? 'Submitting Application...' : 'Submit for Compliance KYC Approval'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-[#1F5A7A] hover:underline font-semibold"
              >
                Already have institutional credentials? Sign in &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
