import React, { useState } from 'react';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { BrandLogo } from '../../shared/components/BrandLogo.jsx';
import { api } from '../../shared/services/api.js';
import {
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  UserPlus,
  AlertCircle,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import { ModalPortal } from '../../shared/components/ModalPortal.jsx';

export function AuthModal({ isOpen, onClose, initialMode = 'login', onSuccess }) {
  const { login, roles } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup'

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Self-Signup State (Retail Originator / Investor only)
  const [signupIntent, setSignupIntent] = useState('ISSUER'); // 'ISSUER' or 'INVESTOR'
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    idType: 'PAN',
    idNumber: '',
    jurisdiction: 'IN',
  });
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupRef, setSignupRef] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleQuickSelect = (r) => {
    setEmail(r.email);
    setPassword('Password@123');
    setError(null);
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!signupForm.name.trim() || !signupForm.email.trim() || !signupForm.idNumber.trim()) {
        throw new Error('All fields are required for participant registration.');
      }

      const res = await api.registerParticipant({
        kind: signupIntent === 'INVESTOR' ? 'INDIVIDUAL' : 'ENTITY',
        orgId: 'ORG-ISSUER',
        jurisdiction: signupForm.jurisdiction,
        pii: {
          legalName: signupForm.name.trim(),
          email: signupForm.email.trim(),
          [signupForm.idType.toLowerCase()]: signupForm.idNumber.trim().toUpperCase(),
        },
      });

      const ref = res?.data?.id || `REG-${Date.now().toString(36).toUpperCase()}`;
      setSignupRef(ref);
      setSignupSuccess(true);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="fixed inset-0 z-50 bg-[#0F2A43]/60 backdrop-blur-sm flex items-center justify-center p-4 app-modal-backdrop">
        <div
        className={`bg-white border border-[#D8E0E8] rounded-2xl shadow-2xl relative overflow-hidden app-modal-content transition-all ${
          mode === 'login' ? 'max-w-3xl w-full' : 'max-w-xl w-full'
        }`}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#8A99AD] hover:text-[#0F2A43] p-1.5 rounded-lg hover:bg-[#F1F5F9] transition z-20"
          title="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {mode === 'login' ? (
          <div className="grid grid-cols-1 md:grid-cols-12">
            {/* Left Column: Authentic Credentials Form */}
            <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <BrandLogo />
                <div className="mt-3">
                  <h2 className="text-lg font-bold text-[#0F2A43] tracking-tight font-['Outfit',sans-serif]">
                    Consortium Node Access
                  </h2>
                  <p className="text-xs text-[#5A6A7E] mt-0.5">
                    Authenticate credentials against network certificate authorities
                  </p>
                </div>

                {error && (
                  <div className="mt-3.5 p-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B42318] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="leading-tight">{error}</span>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="mt-4 space-y-3.5 text-xs">
                  <div>
                    <label className="block text-[#5A6A7E] font-semibold mb-1">Account Email</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-[#8A99AD]" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError(null);
                        }}
                        className="w-full pl-9 pr-3 py-2 border border-[#D8E0E8] rounded-lg text-xs focus:outline-none focus:border-[#1F5A7A] focus:ring-1 focus:ring-[#1F5A7A]/20"
                        placeholder="e.g. admin@assetrust.io"
                        required
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#5A6A7E] font-semibold mb-1">Passphrase Secret</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-[#8A99AD]" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError(null);
                        }}
                        className="w-full pl-9 pr-9 py-2 border border-[#D8E0E8] rounded-lg text-xs focus:outline-none focus:border-[#1F5A7A] focus:ring-1 focus:ring-[#1F5A7A]/20"
                        placeholder="Consortium passphrase"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3 top-2.5 text-[#8A99AD] hover:text-[#0F2A43]"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-[#0F2A43] hover:bg-[#1F5A7A] text-white font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 mt-4 shadow-sm disabled:opacity-60"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{loading ? 'Authenticating with MSP...' : 'Authenticate & Open Workspace'}</span>
                    {!loading && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </form>
              </div>

              <div className="mt-4 pt-3 border-t border-[#F1F5F9] text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className="text-xs text-[#1F5A7A] hover:text-[#0F2A43] hover:underline font-semibold"
                >
                  New Originator or Investor? Self-register &rarr;
                </button>
              </div>
            </div>

            {/* Right Column: Clean Evaluation Personas List */}
            <div className="md:col-span-5 bg-[#F8FAFC] border-t md:border-t-0 md:border-l border-[#E8EEF3] p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-[#E8EEF3]">
                  <span className="text-[10px] uppercase font-bold text-[#5A6A7E] tracking-wider">
                    Evaluation Personas
                  </span>
                  <span className="text-[10px] text-[#0F766E] font-medium">Click to Populate</span>
                </div>

                <div className="mt-2.5 space-y-1.5">
                  {roles.map((r) => (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => handleRoleQuickSelect(r)}
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-left transition flex items-center justify-between group ${
                        email === r.email
                          ? 'border-[#0F2A43] bg-white shadow-2xs font-semibold'
                          : 'border-transparent bg-white/70 hover:bg-white hover:border-[#D8E0E8]'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="text-[11px] font-bold text-[#0F2A43] truncate">{r.label}</div>
                        <div className="text-[9px] text-[#5A6A7E] truncate">{r.org}</div>
                      </div>
                      <span className="text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1] shrink-0">
                        {r.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#E8EEF3] text-center">
                <span className="text-[10px] text-[#8A99AD] font-mono">
                  Default Passphrase: <strong className="text-[#5A6A7E]">Password@123</strong>
                </span>
              </div>
            </div>
          </div>
        ) : signupSuccess ? (
          <div className="p-7 text-center space-y-4 text-xs">
            <CheckCircle2 className="w-10 h-10 text-[#18794E] mx-auto" />
            <h4 className="font-bold text-[#0F2A43] text-base">Application Submitted to Compliance Queue</h4>
            <div className="bg-[#F8FAFC] border border-[#D8E0E8] rounded-xl p-3.5 max-w-sm mx-auto text-center space-y-1">
              <div className="text-[10px] text-[#5A6A7E] uppercase font-bold">Registration Reference</div>
              <div className="font-mono font-bold text-[#0F766E] text-base">{signupRef}</div>
            </div>
            <p className="text-[#5A6A7E] max-w-sm mx-auto leading-relaxed">
              Your participant profile has been registered and is pending KYC verification by the Compliance Officer.
            </p>
            <button
              onClick={() => {
                setSignupSuccess(false);
                setMode('login');
                setError(null);
              }}
              className="px-6 py-2 bg-[#0F2A43] text-white rounded-xl font-semibold text-xs hover:bg-[#1F5A7A] transition"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <div className="p-7">
            <div className="text-center mb-5">
              <h2 className="text-lg font-bold text-[#0F2A43]">Participant Registration</h2>
              <p className="text-xs text-[#5A6A7E] mt-0.5">
                Direct onboarding for Asset Originators and Accredited Investors
              </p>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B42318] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSignupSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#5A6A7E] font-semibold mb-1">Registration Role</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSignupIntent('ISSUER')}
                    className={`p-3 rounded-xl border-2 font-semibold text-center transition ${
                      signupIntent === 'ISSUER'
                        ? 'border-[#0F2A43] bg-[#F0F4F8] text-[#0F2A43]'
                        : 'border-[#D8E0E8] text-[#5A6A7E] hover:border-[#1F5A7A]'
                    }`}
                  >
                    <Building2 className="w-4 h-4 mx-auto mb-1 text-[#1F5A7A]" />
                    Asset Owner / Issuer
                    <div className="text-[10px] font-normal text-[#8A99AD] mt-0.5">Tokenize RWAs</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupIntent('INVESTOR')}
                    className={`p-3 rounded-xl border-2 font-semibold text-center transition ${
                      signupIntent === 'INVESTOR'
                        ? 'border-[#0F2A43] bg-[#F0F4F8] text-[#0F2A43]'
                        : 'border-[#D8E0E8] text-[#5A6A7E] hover:border-[#1F5A7A]'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 mx-auto mb-1 text-[#0F766E]" />
                    Accredited Investor
                    <div className="text-[10px] font-normal text-[#8A99AD] mt-0.5">Acquire & Settle</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[#5A6A7E] font-semibold mb-1">Legal Full Name / Entity *</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Agritech Corp"
                  value={signupForm.name}
                  onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg focus:outline-none focus:border-[#1F5A7A]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#5A6A7E] font-semibold mb-1">Official Contact Email *</label>
                <input
                  type="email"
                  placeholder="e.g. legal@company.com"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg focus:outline-none focus:border-[#1F5A7A]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#5A6A7E] font-semibold mb-1">ID Document Type *</label>
                  <select
                    value={signupForm.idType}
                    onChange={(e) => setSignupForm({ ...signupForm, idType: e.target.value })}
                    className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg bg-white focus:outline-none focus:border-[#1F5A7A]"
                  >
                    <option value="PAN">PAN Card (India)</option>
                    <option value="GSTIN">GSTIN (Tax Reg)</option>
                    <option value="EIN">US EIN / LEI</option>
                    <option value="AADHAAR">Aadhaar (Individual)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#5A6A7E] font-semibold mb-1">Document Identifier *</label>
                  <input
                    type="text"
                    placeholder="e.g. ABCDE1234F"
                    value={signupForm.idNumber}
                    onChange={(e) => setSignupForm({ ...signupForm, idNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg uppercase font-mono focus:outline-none focus:border-[#1F5A7A]"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#0F2A43] hover:bg-[#1F5A7A] text-white font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 mt-4 shadow-sm disabled:opacity-60"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{loading ? 'Submitting Application...' : 'Submit for KYC Approval'}</span>
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="text-xs text-[#1F5A7A] hover:underline font-semibold"
              >
                Already have credentials? Sign in &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  </ModalPortal>
  );
}
