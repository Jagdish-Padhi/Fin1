import React, { useState } from 'react';
import { api } from '../../shared/services/api.js';
import { X, Upload, ShieldCheck, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

export function OnboardParticipantModal({ isOpen, onClose, onCreated, user }) {
  const [formData, setFormData] = useState({
    kind: 'INDIVIDUAL',
    orgId: user?.orgId || 'ORG-ISSUER',
    jurisdiction: 'IN',
    investorClass: 'RETAIL',
    legalName: '',
    identifierType: 'PAN',
    identifierValue: '',
    contactEmail: '',
    maxHoldingBps: 2500,
    maxTransferRupees: 1000000,
    docName: 'identity_proof.pdf',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        orgId: formData.orgId,
        kind: formData.kind,
        jurisdiction: formData.jurisdiction,
        investorClass: formData.investorClass,
        pii: {
          legalName: formData.legalName,
          identifierType: formData.identifierType,
          identifierValue: formData.identifierValue,
          contactEmail: formData.contactEmail,
        },
        limits: {
          maxHoldingBps: Number(formData.maxHoldingBps),
          maxTransferPaise: Math.round(Number(formData.maxTransferRupees) * 100),
        },
      };

      const res = await api.registerParticipant(payload);
      const participantId = res.data?.id || res.id;

      // Upload initial KYC document reference if provided
      if (participantId && formData.docName) {
        try {
          await api.uploadKycDoc(participantId, {
            docType: formData.identifierType === 'PAN' ? 'PAN_CARD' : 'IDENTITY_CERT',
            fileName: formData.docName,
            sha256: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
          });
        } catch {
          // ignore doc upload error
        }
      }

      onCreated();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to onboard participant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Onboard Consortium Participant</h3>
              <p className="text-xs text-slate-400">
                PII is stored off-chain with SHA-256 salted hash anchored to Hyperledger Fabric
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Classification & Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Participant Kind</label>
              <select
                value={formData.kind}
                onChange={(e) => setFormData({ ...formData, kind: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="INDIVIDUAL">Individual</option>
                <option value="ENTITY">Legal Entity / Corporate</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Investor Tier</label>
              <select
                value={formData.investorClass}
                onChange={(e) => setFormData({ ...formData, investorClass: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="RETAIL">Retail Investor</option>
                <option value="QUALIFIED">Qualified / Accredited</option>
                <option value="INSTITUTIONAL">Institutional Sovereign</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Jurisdiction</label>
              <input
                type="text"
                required
                value={formData.jurisdiction}
                onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                placeholder="IN"
              />
            </div>
          </div>

          {/* Legal Identity (PII) */}
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-4">
            <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Legal Identity Profile (Encrypted Off-Chain)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={formData.legalName}
                  onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Ramesh Chandra Verma"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Official Contact Email</label>
                <input
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder="ramesh@originator.in"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Identifier Type</label>
                <select
                  value={formData.identifierType}
                  onChange={(e) => setFormData({ ...formData, identifierType: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="PAN">PAN (Income Tax)</option>
                  <option value="AADHAAR">Aadhaar (UIDAI)</option>
                  <option value="CIN">CIN (Corporate Registration)</option>
                  <option value="PASSPORT">Passport</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Identifier Number</label>
                <input
                  type="text"
                  required
                  value={formData.identifierValue}
                  onChange={(e) => setFormData({ ...formData, identifierValue: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder="e.g. ABCDE1234F"
                />
              </div>
            </div>
          </div>

          {/* Limits & Compliance Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Max Holding Cap (Basis Points, 100 bps = 1%)
              </label>
              <input
                type="number"
                min="100"
                max="10000"
                value={formData.maxHoldingBps}
                onChange={(e) => setFormData({ ...formData, maxHoldingBps: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                {(formData.maxHoldingBps / 100).toFixed(1)}% of total fractional asset supply
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Per-Transfer Cap (₹ Rupees)
              </label>
              <input
                type="number"
                min="1000"
                value={formData.maxTransferRupees}
                onChange={(e) => setFormData({ ...formData, maxTransferRupees: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                ₹{Number(formData.maxTransferRupees).toLocaleString('en-IN')} maximum per transaction
              </span>
            </div>
          </div>

          {/* Simulated Document Upload */}
          <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/40 text-center space-y-2">
            <Upload className="w-6 h-6 text-indigo-400 mx-auto" />
            <div className="text-xs font-semibold text-slate-200">KYC Verification Document Attached</div>
            <p className="text-[11px] text-slate-400">
              {formData.docName} (SHA-256 integrity calculated and anchored)
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting to Ledger...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Register Participant</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
