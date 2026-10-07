import React, { useState } from 'react';
import { api } from '../../shared/services/api.js';
import { StatusBadge } from '../../shared/components/StatusBadge.jsx';
import { HashChip } from '../../shared/components/HashChip.jsx';
import { Search, ShieldCheck, X, CheckCircle2, ArrowRight } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Public Asset Passport & Token Verification</h3>
              <p className="text-xs text-slate-400">Verifiable ledger disclosure without login or private disclosure</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">Enter Token ID or Asset Passport ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. TKN-1728280000000 or AST-..."
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Verify</span>
            </button>
          </div>
        </form>

        {error && (
          <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            {error}
          </div>
        )}

        {passport && (
          <div className="space-y-4 bg-slate-950/60 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 uppercase font-mono">Token Asset Passport</span>
                <h4 className="text-base font-bold text-white">{passport.displayName}</h4>
              </div>
              <StatusBadge status={passport.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-800">
              <div>
                <span className="text-slate-500 block">Token Standard</span>
                <span className="font-semibold text-slate-200">{passport.standard}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Issued Supply</span>
                <span className="font-semibold text-slate-200">
                  {Number(passport.totalUnits).toLocaleString()} {passport.unitLabel}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Rights Type</span>
                <span className="font-semibold text-slate-200">{passport.rightsType}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Holder Count</span>
                <span className="font-semibold text-slate-200">{passport.holderCount} Parties</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs space-y-1">
              <span className="text-slate-500 block font-semibold text-[11px]">Legal Representation Statement</span>
              <p className="text-slate-300 italic">"{passport.representation}"</p>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Mint Transaction:</span>
              <HashChip hash={passport.mintedTxId} />
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
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
