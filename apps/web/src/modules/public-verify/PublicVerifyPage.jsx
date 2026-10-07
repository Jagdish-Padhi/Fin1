import React, { useState } from 'react';
import { api } from '../../shared/services/api.js';
import { StatusBadge } from '../../shared/components/StatusBadge.jsx';
import { HashChip } from '../../shared/components/HashChip.jsx';
import { Search, ShieldCheck, X, CheckCircle2 } from 'lucide-react';

export function PublicVerifyPage({ onClose }) {
  const [tokenId, setTokenId] = useState('');
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!tokenId.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setPassport(null);
      const res = await api.publicVerify(tokenId.trim());
      if (res?.data) {
        setPassport(res.data);
      } else {
        setError('Asset or token passport not found for this identifier.');
      }
    } catch (err) {
      setError(err.message || 'Token not found');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F2A43]/40 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white border border-[#D8E0E8] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-[#D8E0E8] pb-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="AsseTrust" className="w-9 h-9 object-contain" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-['Outfit',sans-serif] font-bold text-sm tracking-tight">
                  <span className="text-[#0F2A43]">Asse</span>
                  <span className="text-[#0F766E]">Trust</span>
                </span>
                <span className="text-xs text-[#5A6A7E]">Public Ledger Disclosure</span>
              </div>
              <h3 className="text-base font-bold text-[#17202A] tracking-tight">Asset & Token Verification</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5A6A7E] hover:text-[#17202A] hover:bg-[#F8FAFC] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="space-y-2">
          <label className="text-xs font-semibold text-[#17202A]">Enter Token ID or Asset Passport ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. TKN-1728280000000 or AST-..."
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              className="flex-1 bg-white border border-[#D8E0E8] rounded-lg px-4 py-2.5 text-xs text-[#17202A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] font-mono"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-[#0F2A43] hover:bg-[#1F5A7A] text-white text-xs font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 transition disabled:opacity-50 shadow-sm"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Verify</span>
            </button>
          </div>
        </form>

        {error && (
          <div className="p-4 rounded-xl bg-[#B42318]/10 border border-[#B42318]/20 text-xs text-[#B42318]">
            {error}
          </div>
        )}

        {passport && (
          <div className="space-y-4 bg-[#F8FAFC] border border-[#D8E0E8] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[#5A6A7E] uppercase font-mono font-semibold">Token Asset Passport</span>
                <h4 className="text-base font-bold text-[#17202A]">{passport.displayName}</h4>
              </div>
              <StatusBadge status={passport.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-[#D8E0E8]">
              <div>
                <span className="text-[#5A6A7E] block text-[11px]">Token Standard</span>
                <span className="font-semibold text-[#17202A]">{passport.standard}</span>
              </div>
              <div>
                <span className="text-[#5A6A7E] block text-[11px]">Total Issued Supply</span>
                <span className="font-semibold text-[#17202A]">
                  {Number(passport.totalUnits).toLocaleString()} {passport.unitLabel}
                </span>
              </div>
              <div>
                <span className="text-[#5A6A7E] block text-[11px]">Rights Type</span>
                <span className="font-semibold text-[#17202A]">{passport.rightsType}</span>
              </div>
              <div>
                <span className="text-[#5A6A7E] block text-[11px]">Holder Count</span>
                <span className="font-semibold text-[#17202A]">{passport.holderCount} Parties</span>
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-[#D8E0E8] text-xs space-y-1 shadow-xs">
              <span className="text-[#5A6A7E] block font-semibold text-[11px]">Legal Representation Statement</span>
              <p className="text-[#17202A] italic">"{passport.representation}"</p>
            </div>

            <div className="pt-2 border-t border-[#D8E0E8] flex items-center justify-between text-xs">
              <span className="text-[#5A6A7E] font-medium">Mint Transaction:</span>
              <HashChip hash={passport.mintedTxId} />
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#18794E]/10 border border-[#18794E]/20 text-[#18794E] text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Immutable consensus reached on channel <strong>rwa-channel</strong> via Hyperledger Fabric 2.5
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
