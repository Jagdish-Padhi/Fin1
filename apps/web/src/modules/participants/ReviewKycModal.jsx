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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Compliance KYC Review</h3>
              <p className="text-xs text-slate-400">
                Participant: <span className="font-mono text-indigo-400">{participant.id}</span>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Participant Summary */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Legal Name:</span>
              <span className="font-semibold text-slate-200">{participant.pii?.legalName || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Organization:</span>
              <span className="font-mono text-slate-300">{participant.orgId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Investor Class:</span>
              <span className="text-purple-400 font-semibold">{participant.investorClass}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Current KYC:</span>
              <span className="text-amber-400 font-mono">{participant.kycStatus}</span>
            </div>
          </div>

          {/* Decision Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Compliance Decision</label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setDecision('APPROVED')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition ${
                  decision === 'APPROVED'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 ring-1 ring-emerald-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <CheckCircle className="w-4 h-4 mb-1" />
                <span>Approve</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('UNDER_REVIEW')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition ${
                  decision === 'UNDER_REVIEW'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 ring-1 ring-amber-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Clock className="w-4 h-4 mb-1" />
                <span>Under Review</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('REJECTED')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition ${
                  decision === 'REJECTED'
                    ? 'bg-rose-500/10 border-rose-500 text-rose-400 ring-1 ring-rose-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <XCircle className="w-4 h-4 mb-1" />
                <span>Reject</span>
              </button>
            </div>
          </div>

          {/* Reason Code & Mandatory Justification */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Reason / Justification <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Identity and tax records verified against national database without discrepancies."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Expiry Date (Optional) */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              KYC Validity Expiration Date (Optional)
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2 rounded-lg text-xs font-semibold text-white shadow-lg flex items-center gap-2 transition disabled:opacity-50 ${
                decision === 'APPROVED'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  : decision === 'REJECTED'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                    : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
              }`}
            >
              {loading ? 'Submitting to Chaincode...' : `Confirm ${decision}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
