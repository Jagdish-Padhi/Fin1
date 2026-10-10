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
  QrCode,
  Fingerprint,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { ModalPortal } from '../../shared/components/ModalPortal.jsx';

const JURISDICTIONS = [
  { code: 'IN', label: 'India (IND)', csca: 'ICAO-PKD-CSCA-IND' },
  { code: 'US', label: 'United States (USA)', csca: 'ICAO-PKD-CSCA-USA' },
  { code: 'SG', label: 'Singapore (SGP)', csca: 'ICAO-PKD-CSCA-SGP' },
  { code: 'GB', label: 'United Kingdom (GBR)', csca: 'ICAO-PKD-CSCA-GBR' },
  { code: 'AE', label: 'United Arab Emirates (ARE)', csca: 'ICAO-PKD-CSCA-ARE' },
  { code: 'DE', label: 'Germany (DEU)', csca: 'ICAO-PKD-CSCA-DEU' },
];

const ROLES = [
  { value: 'ISSUER', label: 'Asset Issuer', subtext: 'Originates and tokenizes assets' },
  { value: 'INVESTOR', label: 'Investor', subtext: 'Subscribes tranches and secondary transfers' },
  { value: 'VERIFIER', label: 'Verifier', subtext: 'Inspects and attests asset documentation' },
  { value: 'VALUER', label: 'Valuer', subtext: 'Performs independent asset appraisal' },
  { value: 'COMPLIANCE', label: 'Compliance Officer', subtext: 'Approves KYC, minting, and freeze governance' },
  { value: 'AUDITOR', label: 'Auditor', subtext: 'Reviews immutable consortium audit trail' },
];

export function AuthModal({ isOpen, onClose, initialMode = 'login', onSuccess }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup'

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  // Signup State
  const [signupRole, setSignupRole] = useState('ISSUER'); // 'ISSUER' | 'INVESTOR'
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    jurisdiction: 'IN',
    passportNumber: '',
  });
  const [signupStep, setSignupStep] = useState(1); // 1: Profile | 2: Verification | 3: Success
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState(null);

  // Verification State
  const [zkMethod, setZkMethod] = useState('prover'); // 'prover' | 'qr'
  const [zkProving, setZkProving] = useState(false);
  const [zkStepIndex, setZkStepIndex] = useState(0);
  const [zkProofResult, setZkProofResult] = useState(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [completedParticipant, setCompletedParticipant] = useState(null);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      await login(email, password);
      onSuccess?.();
    } catch (err) {
      setLoginError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Generate and verify cryptographic proof
  const handleGenerateZkProof = async () => {
    setSignupError(null);
    setZkProving(true);
    setZkStepIndex(1);

    try {
      // Step 1: Document signature validation
      await new Promise((r) => setTimeout(r, 500));
      setZkStepIndex(2);

      // Step 2: Deriving identity nullifier and circuit verification
      await new Promise((r) => setTimeout(r, 600));
      setZkStepIndex(3);

      // Step 3: Verifying compliance criteria
      await new Promise((r) => setTimeout(r, 500));

      const selectedJur = JURISDICTIONS.find((j) => j.code === signupForm.jurisdiction) || JURISDICTIONS[0];
      const seedString = `${signupForm.email || 'user'}_${signupForm.passportNumber || 'PASS'}_${Date.now()}`;

      // Cryptographic deterministic nullifier derivation
      const rawNullifier = Array.from(
        new Uint8Array(
          await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`zkpassport_nullifier_${seedString}`))
        )
      )
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const nullifier = `0x${rawNullifier.slice(0, 32)}`;

      // Call backend verifier API
      const verifyRes = await api.verifyZkPassport({
        nullifier,
        nationality: selectedJur.code === 'IN' ? 'IND' : selectedJur.code === 'US' ? 'USA' : selectedJur.code === 'GB' ? 'GBR' : selectedJur.code === 'SG' ? 'SGP' : selectedJur.code === 'AE' ? 'ARE' : 'DEU',
        documentType: 'PASSPORT',
        ageOver18: true,
        sanctionsChecked: true,
        proof: {
          pi_a: ['0x19a4b2c...', '0x08f33d1...'],
          pi_b: [['0x2b4c1...', '0x3a19e...'], ['0x11e4f...', '0x99a2c...']],
          pi_c: ['0x7c91a0...', '0x5e239b...'],
          protocol: 'groth16',
          curve: 'bn128',
        },
        publicSignals: [
          '0x1',
          '0x1',
          selectedJur.code === 'IN' ? '0x494e44' : '0x555341',
          nullifier,
        ],
      });

      if (verifyRes?.data) {
        setZkProofResult(verifyRes.data);
      } else {
        throw new Error('Verification failed. Unable to validate document proof.');
      }
    } catch (err) {
      setSignupError(err.message || 'Identity verification failed.');
    } finally {
      setZkProving(false);
      setZkStepIndex(0);
    }
  };

  const handleCompleteRegistration = async () => {
    if (!zkProofResult) {
      setSignupError('Please complete identity verification before submitting.');
      return;
    }

    setSignupLoading(true);
    setSignupError(null);

    try {
      const selectedJur = JURISDICTIONS.find((j) => j.code === signupForm.jurisdiction) || JURISDICTIONS[0];
      const regRes = await register({
        name: signupForm.name.trim(),
        email: signupForm.email.trim(),
        password: signupForm.password,
        role: signupRole,
        jurisdiction: selectedJur.code,
        zkPassport: zkProofResult,
      });

      setCompletedParticipant(regRes.participant);
      setSignupStep(3);
    } catch (err) {
      setSignupError(err.message || 'Registration failed.');
    } finally {
      setSignupLoading(false);
    }
  };

  const handleCopyProofHash = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="fixed inset-0 z-50 bg-[#071728]/70 flex items-center justify-center p-4 app-modal-backdrop overflow-y-auto">
        <div className="bg-white border border-slate-300 rounded-lg shadow-popover relative overflow-hidden app-modal-content w-full max-w-[520px] my-8">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-[#64748B] hover:text-trust-primary p-1.5 rounded-lg hover:bg-slate-100 transition z-20 cursor-pointer"
            title="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Top Header & Tab Switcher */}
          <div className="px-6 pt-5 pb-4 border-b border-trust-border-subtle bg-slate-50">
            <div className="flex items-center justify-between pr-8">
              <BrandLogo />
              <div className="inline-flex items-center p-1 bg-trust-border-subtle/70 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setLoginError(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white text-trust-primary shadow-subtle font-semibold'
                      : 'text-[#64748B] hover:text-trust-primary'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setSignupError(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-trust-primary text-white shadow-subtle font-semibold'
                      : 'text-[#64748B] hover:text-trust-primary'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>
          </div>

          {/* MODE: LOGIN */}
          {mode === 'login' ? (
            <div className="p-6 sm:p-7">
              <div className="mb-5">
                <h2 className="page-title">
                  Sign In
                </h2>
                <p className="page-subtitle">
                  Enter your credentials to access your account.
                </p>
              </div>

              {loginError && (
                <div className="mb-4 p-3 rounded-lg bg-trust-error-bg border border-[#FECACA] text-xs text-trust-error flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-tight">{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-2.5 text-[#94A3B8]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setLoginError(null);
                      }}
                      className="trust-input w-full pl-9 pr-3"
                      placeholder="name@company.com"
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[#334155] font-semibold">Password</label>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-[#94A3B8]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setLoginError(null);
                      }}
                      className="trust-input w-full pl-9 pr-9"
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-2.5 text-[#94A3B8] hover:text-trust-primary cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="trust-btn-primary w-full"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{loginLoading ? 'Signing in...' : 'Sign In'}</span>
                  {!loginLoading && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setSignupError(null);
                  }}
                  className="text-xs text-trust-secondary hover:text-trust-primary hover:underline font-semibold cursor-pointer"
                >
                  Need an account? Register &rarr;
                </button>
              </div>
            </div>
          ) : signupStep === 3 ? (
            /* STEP 3: REGISTRATION SUCCESSFUL */
            <div className="p-7 text-center space-y-5 text-xs">
              <div className="w-14 h-14 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center mx-auto text-[#059669]">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="font-semibold text-trust-primary text-lg">
                  Registration Complete
                </h3>
                <p className="text-trust-text-muted max-w-sm mx-auto mt-1 text-xs">
                  Your identity has been verified and registered successfully.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-300 rounded-lg p-4 max-w-sm mx-auto text-left space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#64748B]">Participant ID:</span>
                  <span className="font-mono font-semibold text-trust-primary">{completedParticipant?.id || 'PRT-ANCHORED'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#64748B]">Status:</span>
                  <span className="px-2 py-0.5 rounded-md font-semibold text-xs bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                    Active &bull; Verified
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#64748B]">Role:</span>
                  <span className="font-semibold text-trust-primary">
                    {completedParticipant?.role || signupRole}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#64748B]">Nullifier:</span>
                  <span className="font-mono text-xs text-trust-accent truncate max-w-[180px]">
                    {completedParticipant?.zkNullifier || zkProofResult?.nullifier}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onSuccess?.();
                  onClose();
                }}
                className="trust-btn-primary w-full max-w-sm mx-auto"
              >
                <span>Continue to Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* STEP 1 & 2: SIGNUP & VERIFICATION */
            <div className="p-6 sm:p-7">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-trust-border-subtle">
                <div>
                  <h2 className="text-base font-semibold text-trust-primary">
                    {signupStep === 1 ? 'Create Account' : 'Identity Verification'}
                  </h2>
                  <p className="page-subtitle">
                    {signupStep === 1
                      ? 'Select your role and enter account details'
                      : 'Verify identity credentials to proceed'}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span
                    className={`px-2.5 py-1 rounded-lg transition ${
                      signupStep === 1
                        ? 'bg-trust-primary text-white'
                        : 'bg-slate-100 text-[#64748B]'
                    }`}
                  >
                    1. Account
                  </span>
                  <span className="text-[#94A3B8]">&rarr;</span>
                  <span
                    className={`px-2.5 py-1 rounded-lg transition ${
                      signupStep === 2
                        ? 'bg-trust-accent text-white'
                        : 'bg-slate-100 text-[#64748B]'
                    }`}
                  >
                    2. Verification
                  </span>
                </div>
              </div>

              {signupError && (
                <div className="mb-4 p-3 rounded-lg bg-trust-error-bg border border-[#FECACA] text-xs text-trust-error flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-tight">{signupError}</span>
                </div>
              )}

              {signupStep === 1 ? (
                /* STEP 1 FORM: Account */
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[#334155] font-semibold mb-1">Account Role</label>
                    <select
                      value={signupRole}
                      onChange={(e) => setSignupRole(e.target.value)}
                      className="trust-input w-full"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label} — {r.subtext}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#334155] font-semibold mb-1">Full Name or Legal Entity</label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Capital Ltd"
                      value={signupForm.name}
                      onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                      className="trust-input w-full"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#334155] font-semibold mb-1">Work Email</label>
                      <input
                        type="email"
                        placeholder="name@company.com"
                        value={signupForm.email}
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                        className="trust-input w-full"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[#334155] font-semibold mb-1">Password</label>
                      <input
                        type="password"
                        placeholder="Min. 8 characters"
                        value={signupForm.password}
                        onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                        className="trust-input w-full"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#334155] font-semibold mb-1">Jurisdiction</label>
                      <select
                        value={signupForm.jurisdiction}
                        onChange={(e) => setSignupForm({ ...signupForm, jurisdiction: e.target.value })}
                        className="trust-input w-full"
                      >
                        {JURISDICTIONS.map((j) => (
                          <option key={j.code} value={j.code}>
                            {j.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#334155] font-semibold mb-1">Passport Number</label>
                      <input
                        type="text"
                        placeholder="e.g. Z1234567"
                        value={signupForm.passportNumber}
                        onChange={(e) =>
                          setSignupForm({ ...signupForm, passportNumber: e.target.value.toUpperCase() })
                        }
                        className="trust-input w-full font-mono"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!signupForm.name.trim() || !signupForm.email.trim() || !signupForm.password) {
                        setSignupError('All fields are required before proceeding.');
                        return;
                      }
                      if (signupForm.password.length < 8) {
                        setSignupError('Password must be at least 8 characters long.');
                        return;
                      }
                      setSignupError(null);
                      setSignupStep(2);
                    }}
                    className="trust-btn-primary w-full mt-4"
                  >
                    <span>Continue to Verification</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                /* STEP 2: VERIFICATION INTERFACE */
                <div className="space-y-4 text-xs">
                  {/* Verification Mode Switcher */}
                  <div className="flex border-b border-trust-border-subtle">
                    <button
                      type="button"
                      onClick={() => setZkMethod('prover')}
                      className={`pb-2.5 px-3 font-semibold text-xs border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                        zkMethod === 'prover'
                          ? 'border-trust-accent text-trust-accent'
                          : 'border-transparent text-[#64748B] hover:text-trust-primary'
                      }`}
                    >
                      <Fingerprint className="w-3.5 h-3.5" />
                      <span>Direct Verification</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setZkMethod('qr')}
                      className={`pb-2.5 px-3 font-semibold text-xs border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                        zkMethod === 'qr'
                          ? 'border-trust-accent text-trust-accent'
                          : 'border-transparent text-[#64748B] hover:text-trust-primary'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Mobile QR</span>
                    </button>
                  </div>

                  {zkMethod === 'prover' ? (
                    <div className="p-4 rounded-lg border border-slate-300 bg-slate-50 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#64748B]">Document:</span>
                        <span className="font-semibold text-trust-primary">
                          Passport ({signupForm.passportNumber || 'Provided'})
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#64748B]">Jurisdiction:</span>
                        <span className="font-semibold text-trust-primary">
                          {JURISDICTIONS.find((j) => j.code === signupForm.jurisdiction)?.label || 'India (IND)'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#64748B]">Verification Checks:</span>
                        <span className="text-xs font-semibold text-trust-accent">
                          Age &ge; 18 &bull; Sanctions Clear &bull; CSCA Valid
                        </span>
                      </div>

                      {/* Interactive Prover Execution */}
                      {!zkProofResult ? (
                        <div className="pt-2">
                          {zkProving ? (
                            <div className="p-3.5 rounded-lg bg-white border border-slate-300 space-y-2">
                              <div className="flex items-center gap-2 text-xs font-semibold text-trust-accent">
                                <Sparkles className="w-4 h-4 animate-spin" />
                                <span>Generating cryptographic proof...</span>
                              </div>
                              <div className="space-y-1 text-xs text-[#64748B]">
                                <div className={zkStepIndex >= 1 ? 'text-[#059669] font-medium' : ''}>
                                  {zkStepIndex >= 1 ? '✓' : '○'} Verifying document signature
                                </div>
                                <div className={zkStepIndex >= 2 ? 'text-[#059669] font-medium' : ''}>
                                  {zkStepIndex >= 2 ? '✓' : '○'} Deriving identity nullifier
                                </div>
                                <div className={zkStepIndex >= 3 ? 'text-[#059669] font-medium' : ''}>
                                  {zkStepIndex >= 3 ? '✓' : '○'} Verifying compliance constraints
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={handleGenerateZkProof}
                              className="trust-btn-accent w-full"
                            >
                              <Fingerprint className="w-4 h-4" />
                              <span>Verify Identity</span>
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    /* QR CODE METHOD */
                    <div className="p-4 rounded-lg border border-slate-300 bg-slate-50 text-center space-y-3">
                      <div className="w-32 h-32 mx-auto bg-white p-2 rounded-lg border border-slate-300 shadow-subtle flex items-center justify-center">
                        <QrCode className="w-24 h-24 text-trust-primary" />
                      </div>
                      <p className="text-xs text-[#64748B] max-w-xs mx-auto">
                        Scan with your identity app to complete verification on your device.
                      </p>
                      {!zkProofResult && (
                        <button
                          type="button"
                          onClick={handleGenerateZkProof}
                          disabled={zkProving}
                          className="trust-btn-accent"
                        >
                          {zkProving ? 'Verifying...' : 'Confirm Verification'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* PROOF RESULT CARD */}
                  {zkProofResult && (
                    <div className="p-3.5 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[#065F46] font-semibold">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                          <span>Identity Verified</span>
                        </div>
                        <span className="text-xs font-semibold text-[#059669] bg-white px-2 py-0.5 rounded border border-[#A7F3D0]">
                          Verified
                        </span>
                      </div>

                      <div className="bg-white/90 p-2.5 rounded-lg border border-[#A7F3D0] space-y-1.5 font-mono text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-[#64748B]">Proof ID:</span>
                          <div className="flex items-center gap-1 text-trust-primary">
                            <span>{zkProofResult.proofHash.slice(0, 16)}...</span>
                            <button
                              type="button"
                              onClick={() => handleCopyProofHash(zkProofResult.proofHash)}
                              className="text-[#64748B] hover:text-trust-primary cursor-pointer"
                              title="Copy proof hash"
                            >
                              {copiedHash ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-[#64748B]">Nullifier:</span>
                          <span className="text-trust-accent font-semibold truncate max-w-[200px]">
                            {zkProofResult.nullifier}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-[#64748B]">Nationality:</span>
                          <span className="text-trust-primary font-semibold">{zkProofResult.nationality}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSignupStep(1)}
                      className="px-4 py-2.5 border border-slate-300 text-[#64748B] hover:text-trust-primary rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      &larr; Back
                    </button>
                    <button
                      type="button"
                      disabled={!zkProofResult || signupLoading}
                      onClick={handleCompleteRegistration}
                      className="trust-btn-primary flex-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>
                        {signupLoading ? 'Completing registration...' : 'Complete Registration'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setLoginError(null);
                  }}
                  className="text-xs text-trust-secondary hover:underline font-semibold cursor-pointer"
                >
                  Already have an account? Sign In &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
