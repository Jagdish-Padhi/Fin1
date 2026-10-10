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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
      <div className="bg-white border border-trust-border rounded-lg w-full max-w-lg shadow-popover">
        <div className="p-5 border-b border-trust-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-trust-warning-bg border border-trust-warning-border text-trust-warning">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-trust-primary">
                Compliance KYC Decision
              </h3>
              <p className="text-xs text-trust-text-muted">
                Participant ID: <span className="font-mono text-trust-accent font-semibold">{participant.id}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-trust-text-muted hover:text-trust-primary hover:bg-slate-50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-lg bg-trust-error-bg border border-trust-error-border text-xs text-trust-error flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Decision Selector */}
          <div>
            <label className="block text-xs font-semibold text-trust-text mb-2">Compliance Action</label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setDecision('APPROVED')}
                className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                  decision === 'APPROVED'
                    ? 'bg-trust-success-bg border-trust-success text-trust-success shadow-subtle'
                    : 'bg-slate-50 border-trust-border text-trust-text-muted hover:bg-white'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>Approve KYC</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('UNDER_REVIEW')}
                className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                  decision === 'UNDER_REVIEW'
                    ? 'bg-trust-warning-bg border-trust-warning text-trust-warning shadow-subtle'
                    : 'bg-slate-50 border-trust-border text-trust-text-muted hover:bg-white'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Hold / Review</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('REJECTED')}
                className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                  decision === 'REJECTED'
                    ? 'bg-trust-error-bg border-trust-error text-trust-error shadow-subtle'
                    : 'bg-slate-50 border-trust-border text-trust-text-muted hover:bg-white'
                }`}
              >
                <XCircle className="w-4 h-4" />
                <span>Reject KYC</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-trust-text mb-1">
              Audit Decision Justification *
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a regulatory rationale (e.g. Identity documents cross-verified with registry)..."
              className="w-full bg-slate-50 border border-trust-border rounded-lg p-3 text-xs text-trust-text focus:outline-none focus:border-trust-secondary focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-trust-text mb-1">
              KYC Expiry Date (Optional)
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full bg-slate-50 border border-trust-border rounded-lg p-2.5 text-xs text-trust-text focus:outline-none focus:border-trust-secondary focus:bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-trust-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-trust-text-muted hover:text-trust-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="trust-btn-primary"
            >
              {loading ? 'Committing...' : 'Commit KYC Decision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
