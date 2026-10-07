import React from 'react';
import { StatusBadge } from '../../shared/components/StatusBadge.jsx';
import { HashChip } from '../../shared/components/HashChip.jsx';
import { X, ShieldCheck, User, Building, FileText, CheckCircle2, AlertTriangle, Key } from 'lucide-react';

export function ParticipantDetailDrawer({ participant, onClose, onOpenReviewKyc, user }) {
  if (!participant) return null;

  const isCompliance = user?.role === 'COMPLIANCE';
  const isAdmin = user?.role === 'ADMINISTRATOR';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-xl h-full flex flex-col shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Participant Ledger Passport</h3>
              <div className="text-xs font-mono text-slate-400">{participant.id}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Status Bar */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1 font-semibold">
                KYC Verification
              </div>
              <StatusBadge status={participant.kycStatus} />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1 font-semibold">
                Ledger Status
              </div>
              <StatusBadge status={participant.status} />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1 font-semibold">
                Investor Class
              </div>
              <StatusBadge status={participant.investorClass} />
            </div>
          </div>

          {/* Cryptographic Integrity Section */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              <Key className="w-4 h-4" />
              <span>Hyperledger Fabric Identity & Cryptography</span>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">On-Chain Salted PII Hash (SHA-256):</span>
                {participant.piiHash ? (
                  <HashChip hash={participant.piiHash} />
                ) : (
                  <span className="text-slate-500 italic">Redacted by role visibility policy</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-slate-500 text-[11px]">Consortium MSP:</span>
                  <div className="font-mono text-slate-200">{participant.mspId || participant.orgId}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Jurisdiction:</span>
                  <div className="font-semibold text-slate-200">{participant.jurisdiction}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Verified Legal PII (If Accessible) */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Off-Chain Encrypted Identity Profile</span>
            </div>
            {participant.pii ? (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Legal Entity / Name:</span>
                  <span className="font-semibold text-slate-100">{participant.pii.legalName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Official Email:</span>
                  <span className="font-mono text-slate-300">{participant.pii.contactEmail || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Document Type:</span>
                  <span className="font-mono text-slate-300">{participant.pii.identifierType || 'PAN'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Identifier Value:</span>
                  <span className="font-mono text-indigo-400 font-semibold">
                    {participant.pii.identifierValue || participant.pii.pan || '••••••••'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Raw PII is redacted for your current role under consortium privacy guidelines.</span>
              </div>
            )}
          </div>

          {/* Rule Limits */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              <Building className="w-4 h-4" />
              <span>Eligibility & Holding Rules (Enforced by Chaincode)</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Max Fractional Holding:</span>
                <span className="text-base font-bold text-white">
                  {((participant.limits?.maxHoldingBps || 2500) / 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {participant.limits?.maxHoldingBps || 2500} Basis Points
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Per-Transfer Cap:</span>
                <span className="text-base font-bold text-white">
                  ₹{(((participant.limits?.maxTransferPaise || 100000000) / 100)).toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-500 block">Integer Paise Enforced</span>
              </div>
            </div>
          </div>

          {/* Compliance History / Notes */}
          {participant.kycReason && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                Last Compliance Decision Note:
              </span>
              <p className="text-xs text-slate-200 italic bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                "{participant.kycReason}"
              </p>
            </div>
          )}

          {/* Documents */}
          <div className="space-y-2">
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">
              Attached KYC Documents:
            </span>
            {participant.kycDocs && participant.kycDocs.length > 0 ? (
              <div className="space-y-2">
                {participant.kycDocs.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <div>
                        <div className="font-semibold text-slate-200">{doc.fileName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">SHA-256: {doc.sha256?.substring(0, 16)}...</div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Verified
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-950 text-xs text-slate-500 italic">
                No external document artifacts attached
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        {isCompliance && (
          <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 p-4 flex items-center justify-end gap-3">
            <button
              onClick={() => {
                onClose();
                onOpenReviewKyc(participant);
              }}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20 transition flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Review / Update KYC Status</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
