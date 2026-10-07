import React, { useState } from 'react';
import { api } from '../../shared/services/api.js';
import { X, ShieldCheck, AlertCircle, Building, User, Lock } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F2A43]/40 backdrop-blur-xs">
      <div className="bg-white border border-[#D8E0E8] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-popover">
        <div className="sticky top-0 bg-white border-b border-[#D8E0E8] p-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#F0F4F8] text-[#0F2A43] border border-[#D8E0E8]">
              <ShieldCheck className="w-5 h-5 text-[#0F766E]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F2A43] font-['Outfit',sans-serif]">
                Onboard Consortium Participant
              </h3>
              <p className="text-xs text-[#5A6A7E]">
                PII stored off-chain with SHA-256 salted hash anchored to Hyperledger Fabric
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5A6A7E] hover:text-[#0F2A43] hover:bg-[#F8FAFC] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECDD3] text-xs text-[#B42318] flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Classification & Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#17202A] mb-1">Participant Kind</label>
              <select
                value={formData.kind}
                onChange={(e) => setFormData({ ...formData, kind: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#D8E0E8] rounded-lg px-3 py-2 text-xs text-[#17202A] focus:outline-none focus:border-[#1F5A7A] focus:bg-white"
              >
                <option value="INDIVIDUAL">Individual</option>
                <option value="ENTITY">Legal Entity / Corporate</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17202A] mb-1">Investor Tier</label>
              <select
                value={formData.investorClass}
                onChange={(e) => setFormData({ ...formData, investorClass: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#D8E0E8] rounded-lg px-3 py-2 text-xs text-[#17202A] focus:outline-none focus:border-[#1F5A7A] focus:bg-white"
              >
                <option value="RETAIL">Retail Investor</option>
                <option value="QUALIFIED">Qualified / Accredited</option>
                <option value="INSTITUTIONAL">Institutional Sovereign</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17202A] mb-1">Jurisdiction</label>
              <input
                type="text"
                required
                value={formData.jurisdiction}
                onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#D8E0E8] rounded-lg px-3 py-2 text-xs text-[#17202A] focus:outline-none focus:border-[#1F5A7A] focus:bg-white"
                placeholder="IN"
              />
            </div>
          </div>

          {/* Legal Identity (PII) */}
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#D8E0E8] space-y-3.5">
            <div className="text-xs font-bold text-[#0F766E] uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Legal Identity Profile (Privileged Vault)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#17202A] mb-1">Legal Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.legalName}
                  onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                  placeholder="e.g. Reliance Asset Capital Ltd"
                  className="w-full bg-white border border-[#D8E0E8] rounded-lg px-3 py-2 text-xs text-[#17202A] focus:outline-none focus:border-[#1F5A7A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17202A] mb-1">Contact Email *</label>
                <input
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="compliance@firm.in"
                  className="w-full bg-white border border-[#D8E0E8] rounded-lg px-3 py-2 text-xs text-[#17202A] focus:outline-none focus:border-[#1F5A7A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17202A] mb-1">ID Document Type</label>
                <select
                  value={formData.identifierType}
                  onChange={(e) => setFormData({ ...formData, identifierType: e.target.value })}
                  className="w-full bg-white border border-[#D8E0E8] rounded-lg px-3 py-2 text-xs text-[#17202A] focus:outline-none focus:border-[#1F5A7A]"
                >
                  <option value="PAN">PAN (Permanent Account Number)</option>
                  <option value="CIN">CIN (Corporate Identity Number)</option>
                  <option value="PASSPORT">Passport</option>
                  <option value="AADHAAR">Aadhaar (Redacted)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17202A] mb-1">Identifier Value *</label>
                <input
                  type="text"
                  required
                  value={formData.identifierValue}
                  onChange={(e) => setFormData({ ...formData, identifierValue: e.target.value.toUpperCase() })}
                  placeholder="AAACB1234F"
                  className="w-full bg-white border border-[#D8E0E8] rounded-lg px-3 py-2 text-xs text-[#17202A] font-mono focus:outline-none focus:border-[#1F5A7A]"
                />
              </div>
            </div>
          </div>

          {/* Limits & Compliance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#17202A] mb-1">
                Max Holding Cap (bps, 100 = 1%)
              </label>
              <input
                type="number"
                min="100"
                max="10000"
                value={formData.maxHoldingBps}
                onChange={(e) => setFormData({ ...formData, maxHoldingBps: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#D8E0E8] rounded-lg px-3 py-2 text-xs text-[#17202A] focus:outline-none focus:border-[#1F5A7A] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17202A] mb-1">
                Per-Transfer Limit (₹ Rupees)
              </label>
              <input
                type="number"
                min="1000"
                value={formData.maxTransferRupees}
                onChange={(e) => setFormData({ ...formData, maxTransferRupees: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#D8E0E8] rounded-lg px-3 py-2 text-xs text-[#17202A] focus:outline-none focus:border-[#1F5A7A] focus:bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#D8E0E8]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#5A6A7E] hover:text-[#17202A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold bg-[#0F2A43] hover:bg-[#0A1E30] text-white rounded-lg transition shadow-xs"
            >
              {loading ? 'Submitting to Ledger...' : 'Onboard Participant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
