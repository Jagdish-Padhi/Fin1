import React, { useState } from 'react';
import { api } from '../../shared/services/api.js';
import { X, ShieldCheck, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';

export function ReviewKycModal({ isOpen, onClose, participant, onUpdated }) {
  const [decision, setDecision] = useState('APPROVED');
  const [reason, setReason] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !participant) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A justification / decision reason is mandatory for auditable compliance');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.updateKycStatus(participant.id, decision, reason, expiryDate || undefined);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update KYC status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F2A43]/40 backdrop-blur-xs">
      <div className="bg-white border border-[#D8E0E8] rounded-2xl w-full max-w-lg shadow-popover">
        <div className="p-5 border-b border-[#D8E0E8] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#FEFCE8] border border-[#FEF08A] text-[#A16207]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F2A43] font-['Outfit',sans-serif]">
                Compliance KYC Decision
              </h3>
              <p className="text-xs text-[#5A6A7E]">
                Participant ID: <span className="font-mono text-[#0F766E] font-semibold">{participant.id}</span>
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
            <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECDD3] text-xs text-[#B42318] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Decision Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#17202A] mb-2">Compliance Action</label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setDecision('APPROVED')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                  decision === 'APPROVED'
                    ? 'bg-[#F0FDF4] border-[#18794E] text-[#18794E] shadow-2xs'
                    : 'bg-[#F8FAFC] border-[#D8E0E8] text-[#5A6A7E] hover:bg-white'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>Approve KYC</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('UNDER_REVIEW')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                  decision === 'UNDER_REVIEW'
                    ? 'bg-[#FEFCE8] border-[#A16207] text-[#A16207] shadow-2xs'
                    : 'bg-[#F8FAFC] border-[#D8E0E8] text-[#5A6A7E] hover:bg-white'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Hold / Review</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('REJECTED')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                  decision === 'REJECTED'
                    ? 'bg-[#FEF2F2] border-[#B42318] text-[#B42318] shadow-2xs'
                    : 'bg-[#F8FAFC] border-[#D8E0E8] text-[#5A6A7E] hover:bg-white'
                }`}
              >
                <XCircle className="w-4 h-4" />
                <span>Reject KYC</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17202A] mb-1">
              Audit Decision Justification *
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a regulatory rationale (e.g. Identity documents cross-verified with registry)..."
              className="w-full bg-[#F8FAFC] border border-[#D8E0E8] rounded-xl p-3 text-xs text-[#17202A] focus:outline-none focus:border-[#1F5A7A] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17202A] mb-1">
              KYC Expiry Date (Optional)
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#D8E0E8] rounded-xl p-2.5 text-xs text-[#17202A] focus:outline-none focus:border-[#1F5A7A] focus:bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#D8E0E8]">
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
              className="px-5 py-2 text-xs font-semibold bg-[#0F2A43] hover:bg-[#0A1E30] text-white rounded-lg transition"
            >
              {loading ? 'Committing...' : 'Commit KYC Decision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
