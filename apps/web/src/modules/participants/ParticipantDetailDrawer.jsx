import React from 'react';
import { StatusBadge } from '../../shared/components/StatusBadge.jsx';
import { HashChip } from '../../shared/components/HashChip.jsx';
import { X, ShieldCheck, User, Building, FileText, Lock, Key, Fingerprint } from 'lucide-react';

export function ParticipantDetailDrawer({ participant, onClose, onOpenReviewKyc, user }) {
  if (!participant) return null;

  const isCompliance = user?.role === 'COMPLIANCE';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#0F2A43]/40 backdrop-blur-xs">
      <div className="bg-white border-l border-[#D8E0E8] w-full max-w-xl h-full flex flex-col shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#D8E0E8] p-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#F0F4F8] border border-[#D8E0E8] text-[#0F2A43]">
              <User className="w-5 h-5 text-[#1F5A7A]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F2A43] font-['Outfit',sans-serif]">
                Participant Identity Passport
              </h3>
              <div className="text-xs font-mono text-[#0F766E] font-semibold">{participant.id}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5A6A7E] hover:text-[#0F2A43] hover:bg-[#F8FAFC] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 flex-1">
          {/* Status Bar */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#F8FAFC] border border-[#D8E0E8]">
            <div>
              <div className="text-[10px] text-[#5A6A7E] uppercase tracking-wider mb-1 font-bold">
                KYC Verification
              </div>
              <StatusBadge status={participant.kycStatus} />
            </div>
            <div>
              <div className="text-[10px] text-[#5A6A7E] uppercase tracking-wider mb-1 font-bold">
                Ledger Status
              </div>
              <StatusBadge status={participant.status} />
            </div>
            <div>
              <div className="text-[10px] text-[#5A6A7E] uppercase tracking-wider mb-1 font-bold">
                Investor Class
              </div>
              <StatusBadge status={participant.investorClass} />
            </div>
          </div>

          {/* ZKPassport Biometric Verification Anchor */}
          {(participant.zkProofHash || participant.zkPassport) && (
            <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#15803D] uppercase tracking-wider">
                  <Fingerprint className="w-4 h-4" />
                  <span>ZKPassport Biometric KYC (ICAO 9303)</span>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]">
                  Zero-Knowledge Validated
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-[#BBF7D0]">
                  <span className="text-xs text-[#5A6A7E] font-medium">ZK Proof Hash:</span>
                  <HashChip hash={participant.zkProofHash || participant.zkPassport?.proofHash} />
                </div>
                <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-[#BBF7D0]">
                  <span className="text-xs text-[#5A6A7E] font-medium">Sybil-Resistant Nullifier:</span>
                  <HashChip hash={participant.zkNullifier || participant.zkPassport?.nullifier} />
                </div>
                <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-[#BBF7D0] text-xs">
                  <span className="text-[#5A6A7E] font-medium">CSCA Signer Authority:</span>
                  <span className="font-mono text-xs text-[#0F2A43] font-semibold">
                    {participant.zkPassport?.issuerAuthority || `ICAO-PKD-CSCA-${participant.jurisdiction || 'IND'}`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Cryptographic Integrity Section */}
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#D8E0E8] space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0F766E] uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Cryptographic Anchors (Hyperledger Fabric)</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-[#D8E0E8]">
                <span className="text-xs text-[#5A6A7E] font-medium">PII Salted Hash:</span>
                <HashChip hash={participant.piiHash} />
              </div>
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-[#D8E0E8]">
                <span className="text-xs text-[#5A6A7E] font-medium">Organization MSP:</span>
                <span className="font-mono text-xs text-[#0F2A43] font-semibold">{participant.mspId || participant.orgId}</span>
              </div>
            </div>
          </div>

          {/* Identity & Legal Info */}
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#D8E0E8] space-y-3">
            <div className="text-xs font-bold text-[#0F2A43] uppercase tracking-wider flex items-center gap-2">
              <Building className="w-4 h-4 text-[#1F5A7A]" />
              <span>Legal Entity Profile</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-[#D8E0E8]">
                <span className="text-[10px] text-[#5A6A7E] block uppercase font-bold">Legal Name</span>
                <span className="font-bold text-[#17202A] text-xs">
                  {participant.pii?.legalName || '[RESTRICTED PRIVILEGED]'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-[#D8E0E8]">
                <span className="text-[10px] text-[#5A6A7E] block uppercase font-bold">Jurisdiction</span>
                <span className="font-semibold text-[#17202A] text-xs">{participant.jurisdiction || 'IN'}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-[#D8E0E8]">
                <span className="text-[10px] text-[#5A6A7E] block uppercase font-bold">Identity Identifier</span>
                <span className="font-mono font-semibold text-[#17202A] text-xs">
                  {participant.pii?.identifierType
                    ? `${participant.pii.identifierType}: ${participant.pii.identifierValue}`
                    : '[SALTED HASH ONLY]'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-[#D8E0E8]">
                <span className="text-[10px] text-[#5A6A7E] block uppercase font-bold">Contact Email</span>
                <span className="text-[#17202A] text-xs font-medium">
                  {participant.pii?.contactEmail || '[CONFIDENTIAL]'}
                </span>
              </div>
            </div>
          </div>

          {/* Holding & Transfer Cap Rules */}
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#D8E0E8] space-y-3">
            <div className="text-xs font-bold text-[#0F2A43] uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-[#0F766E]" />
              <span>Trading Limits & Rule Constraints</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-[#D8E0E8]">
                <span className="text-[10px] text-[#5A6A7E] block uppercase font-bold">Max Fractional Cap</span>
                <span className="font-bold text-[#0F2A43] text-sm">
                  {((participant.limits?.maxHoldingBps || 2500) / 100).toFixed(2)}%
                </span>
                <span className="text-[10px] text-[#5A6A7E] block">({participant.limits?.maxHoldingBps || 2500} bps)</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-[#D8E0E8]">
                <span className="text-[10px] text-[#5A6A7E] block uppercase font-bold">Per-Transfer Cap</span>
                <span className="font-bold text-[#0F2A43] text-sm">
                  ₹{(((participant.limits?.maxTransferPaise || 100000000) / 100)).toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-[#5A6A7E] block">Compliance ceiling</span>
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
                className="w-full py-2.5 rounded-xl bg-[#0F2A43] hover:bg-[#0A1E30] text-white text-xs font-semibold flex items-center justify-center gap-2 transition shadow-xs"
              >
                <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
                <span>Open KYC Review Dialog</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
