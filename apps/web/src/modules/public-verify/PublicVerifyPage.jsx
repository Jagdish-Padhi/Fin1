import React, { useState } from 'react';
import { api } from '../../shared/services/api.js';
import { StatusBadge } from '../../shared/components/StatusBadge.jsx';
import { HashChip } from '../../shared/components/HashChip.jsx';
import { BrandLogo } from '../../shared/components/BrandLogo.jsx';
import { Search, X, CheckCircle2 } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-trust-primary/40 flex items-center justify-center p-4">
      <div className="bg-white border border-trust-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-popover p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-trust-border pb-4">
          <div className="flex items-center gap-3.5">
            <BrandLogo showSubtitle={false} />
            <div className="h-6 w-[1px] bg-trust-border hidden sm:block" />
            <h3 className="text-sm sm:text-base font-semibold text-trust-text tracking-tight">Public Verification</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-trust-text-muted hover:text-trust-text hover:bg-slate-50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="space-y-2">
          <label className="text-xs font-semibold text-trust-text">Enter Token ID or Asset Passport ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. AST-LAND-001 or TKN-LAND-001"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              className="trust-input flex-1 font-mono"
            />
            <button
              type="submit"
              disabled={loading}
              className="trust-btn-primary"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Verify</span>
            </button>
          </div>
        </form>

        {error && (
          <div className="p-4 rounded-lg bg-trust-error/10 border border-trust-error/20 text-xs text-trust-error">
            {error}
          </div>
        )}

        {passport && (
          <div className="space-y-4 bg-slate-50 border border-trust-border rounded-lg p-5 shadow-subtle">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-trust-text-muted font-mono font-semibold">Token Asset Passport</span>
                <h4 className="text-base font-semibold text-trust-text">{passport.displayName}</h4>
              </div>
              <StatusBadge status={passport.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-trust-border">
              <div>
                <span className="text-trust-text-muted block text-xs">Token Standard</span>
                <span className="font-semibold text-trust-text">{passport.standard}</span>
              </div>
              <div>
                <span className="text-trust-text-muted block text-xs">Total Issued Supply</span>
                <span className="font-semibold text-trust-text">
                  {Number(passport.totalUnits).toLocaleString()} {passport.unitLabel}
                </span>
              </div>
              <div>
                <span className="text-trust-text-muted block text-xs">Rights Type</span>
                <span className="font-semibold text-trust-text">{passport.rightsType}</span>
              </div>
              <div>
                <span className="text-trust-text-muted block text-xs">Holder Count</span>
                <span className="font-semibold text-trust-text">{passport.holderCount} Parties</span>
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-lg border border-trust-border text-xs space-y-1 shadow-subtle">
              <span className="text-trust-text-muted block font-semibold text-xs">Legal Representation Statement</span>
              <p className="text-trust-text italic">"{passport.representation}"</p>
            </div>

            <div className="pt-2 border-t border-trust-border flex items-center justify-between text-xs">
              <span className="text-trust-text-muted font-medium">Mint Transaction:</span>
              <HashChip hash={passport.mintedTxId} />
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-trust-success/10 border border-trust-success/20 text-trust-success text-xs font-medium">
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
