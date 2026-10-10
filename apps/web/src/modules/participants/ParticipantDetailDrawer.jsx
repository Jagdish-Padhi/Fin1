import React from 'react';
import { StatusBadge } from '../../shared/components/StatusBadge.jsx';
import { HashChip } from '../../shared/components/HashChip.jsx';
import { X, ShieldCheck, User, Building, FileText, Lock, Key, Fingerprint } from 'lucide-react';

export function ParticipantDetailDrawer({ participant, onClose, onOpenReviewKyc, user }) {
  if (!participant) return null;

  const isCompliance = user?.role === 'COMPLIANCE';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
      <div className="bg-white border-l border-trust-border w-full max-w-xl h-full flex flex-col shadow-popover overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-trust-border p-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-slate-100 border border-trust-border text-trust-primary">
              <User className="w-5 h-5 text-trust-secondary" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-trust-primary">
                Participant Identity Passport
              </h3>
              <div className="text-xs font-mono text-trust-accent font-semibold">{participant.id}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-trust-text-muted hover:text-trust-primary hover:bg-slate-50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 flex-1">
          {/* Status Bar */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-trust-border">
            <div>
              <div className="text-xs text-trust-text-muted mb-1 font-semibold">
                KYC Verification
              </div>
              <StatusBadge status={participant.kycStatus} />
            </div>
            <div>
              <div className="text-xs text-trust-text-muted mb-1 font-semibold">
                Ledger Status
              </div>
              <StatusBadge status={participant.status} />
            </div>
            <div>
              <div className="text-xs text-trust-text-muted mb-1 font-semibold">
                Investor Class
              </div>
              <StatusBadge status={participant.investorClass} />
            </div>
          </div>

          {/* ZKPassport Biometric Verification Anchor */}
          {(participant.zkProofHash || participant.zkPassport) && (
            <div className="p-4 rounded-lg bg-trust-success-bg border border-trust-success-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#15803D]">
                  <Fingerprint className="w-4 h-4" />
                  <span>ZKPassport Biometric KYC (ICAO 9303)</span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]">
                  Zero-Knowledge Validated
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-trust-success-border">
                  <span className="text-xs text-trust-text-muted font-medium">ZK Proof Hash:</span>
                  <HashChip hash={participant.zkProofHash || participant.zkPassport?.proofHash} />
                </div>
                <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-trust-success-border">
                  <span className="text-xs text-trust-text-muted font-medium">Sybil-Resistant Nullifier:</span>
                  <HashChip hash={participant.zkNullifier || participant.zkPassport?.nullifier} />
                </div>
                <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-trust-success-border text-xs">
                  <span className="text-trust-text-muted font-medium">CSCA Signer Authority:</span>
                  <span className="font-mono text-xs text-trust-primary font-semibold">
                    {participant.zkPassport?.issuerAuthority || `ICAO-PKD-CSCA-${participant.jurisdiction || 'IND'}`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Cryptographic Integrity Section */}
          <div className="p-4 rounded-lg bg-slate-50 border border-trust-border space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-trust-accent">
              <ShieldCheck className="w-4 h-4" />
              <span>Cryptographic Anchors (Hyperledger Fabric)</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-trust-border">
                <span className="text-xs text-trust-text-muted font-medium">PII Salted Hash:</span>
                <HashChip hash={participant.piiHash} />
              </div>
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-trust-border">
                <span className="text-xs text-trust-text-muted font-medium">Organization MSP:</span>
                <span className="font-mono text-xs text-trust-primary font-semibold">{participant.mspId || participant.orgId}</span>
              </div>
            </div>
          </div>

          {/* Identity & Legal Info */}
          <div className="p-4 rounded-lg bg-slate-50 border border-trust-border space-y-3">
            <div className="text-xs font-semibold text-trust-primary flex items-center gap-2">
              <Building className="w-4 h-4 text-trust-secondary" />
              <span>Legal Entity Profile</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-trust-border">
                <span className="text-xs text-trust-text-muted block font-semibold">Legal Name</span>
                <span className="font-semibold text-trust-text text-xs">
                  {participant.pii?.legalName || '[RESTRICTED PRIVILEGED]'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-trust-border">
                <span className="text-xs text-trust-text-muted block font-semibold">Jurisdiction</span>
                <span className="font-semibold text-trust-text text-xs">{participant.jurisdiction || 'IN'}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-trust-border">
                <span className="text-xs text-trust-text-muted block font-semibold">Identity Identifier</span>
                <span className="font-mono font-semibold text-trust-text text-xs">
                  {participant.pii?.identifierType
                    ? `${participant.pii.identifierType}: ${participant.pii.identifierValue}`
                    : '[SALTED HASH ONLY]'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-trust-border">
                <span className="text-xs text-trust-text-muted block font-semibold">Contact Email</span>
                <span className="text-trust-text text-xs font-medium">
                  {participant.pii?.contactEmail || '[CONFIDENTIAL]'}
                </span>
              </div>
            </div>
          </div>

          {/* Holding & Transfer Cap Rules */}
          <div className="p-4 rounded-lg bg-slate-50 border border-trust-border space-y-3">
            <div className="text-xs font-semibold text-trust-primary flex items-center gap-2">
              <Key className="w-4 h-4 text-trust-accent" />
              <span>Trading Limits & Rule Constraints</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-trust-border">
                <span className="text-xs text-trust-text-muted block font-semibold">Max Fractional Cap</span>
                <span className="font-semibold text-trust-primary text-sm">
                  {((participant.limits?.maxHoldingBps || 2500) / 100).toFixed(2)}%
                </span>
                <span className="text-xs text-trust-text-muted block">({participant.limits?.maxHoldingBps || 2500} bps)</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-trust-border">
                <span className="text-xs text-trust-text-muted block font-semibold">Per-Transfer Cap</span>
                <span className="font-semibold text-trust-primary text-sm">
                  ₹{(((participant.limits?.maxTransferPaise || 100000000) / 100)).toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-trust-text-muted block">Compliance ceiling</span>
              </div>
            </div>
          </div>

          {/* Action Trigger for Compliance */}
          {isCompliance && (
            <div className="pt-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenReviewKyc(participant);
                }}
                className="trust-btn-primary w-full"
              >
                <ShieldCheck className="w-4 h-4 text-trust-accent" />
                <span>Open KYC Review Dialog</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
