import React, { useState, useEffect } from 'react';
import { api } from '../../shared/services/api.js';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { useToast } from '../../shared/components/Toast.jsx';
import { can } from '../../shared/utils/permissions.js';
import { Coins, PlusCircle, Users, ExternalLink, ShieldCheck, RefreshCw, CheckCircle2 } from 'lucide-react';

export function TokensView() {
  const { user } = useAuth();
  const toast = useToast();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedToken, setSelectedToken] = useState(null);
  const [holders, setHolders] = useState([]);
  const [loadingHolders, setLoadingHolders] = useState(false);

  // Mint Form State
  const [showMintModal, setShowMintModal] = useState(false);
  const [submittingMint, setSubmittingMint] = useState(false);
  const [assetId, setAssetId] = useState('');
  const [standard, setStandard] = useState('FRACTIONAL');
  const [totalUnits, setTotalUnits] = useState(10000);
  const [unitLabel, setUnitLabel] = useState('SQM');
  const [rightsType, setRightsType] = useState('UNDIVIDED_FRACTION');
  const [representation, setRepresentation] = useState('Undivided economic fractional interest');

  const canMint = can(user?.role, 'mintToken');
  const canViewCapTable = can(user?.role, 'viewCapTable') || can(user?.role, 'viewHolders');

  const loadTokens = async () => {
    try {
      setLoading(true);
      const res = await api.getTokens();
      const list = res.data || [];
      setTokens(list);
      if (list.length > 0) {
        if (!selectedToken || !list.some((t) => t.id === selectedToken.id)) {
          handleSelectToken(list[0]);
        } else {
          const current = list.find((t) => t.id === selectedToken.id);
          handleSelectToken(current);
        }
      }
    } catch (err) {
      console.error('Failed to load tokens:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectToken = async (tok) => {
    if (!tok) return;
    setSelectedToken(tok);
    try {
      setLoadingHolders(true);
      if (canViewCapTable) {
        const res = await api.getTokenHolders(tok.id);
        setHolders(res.data || []);
      } else {
        setHolders([]);
      }
    } catch (err) {
      setHolders([]);
    } finally {
      setLoadingHolders(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, []);

  const handleMint = async (e) => {
    e.preventDefault();
    try {
      setSubmittingMint(true);
      await api.mintToken({
        assetId,
        standard,
        totalUnits: Number(totalUnits),
        unitLabel,
        rightsType,
        representation,
      });
      setShowMintModal(false);
      toast.success(`Security token minted successfully for asset ${assetId}. Cap table initialized on ledger.`);
      await loadTokens();
    } catch (err) {
      toast.error(err.message || 'Token minting failed. Check asset verification & valuation approval.');
    } finally {
      setSubmittingMint(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D8E0E8]">
        <div>
          <h2 className="text-xl font-bold text-[#0F2A43] flex items-center gap-2">
            <Coins className="w-6 h-6 text-[#1F5A7A]" />
            Tokenized Securities Directory
          </h2>
          <p className="text-xs text-[#5A6A7E] mt-1">
            Real-world asset security tokens anchored directly to verified physical collateral with on-chain cap tables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadTokens}
            disabled={loading}
            className="p-2 border border-[#D8E0E8] rounded-lg text-[#5A6A7E] hover:bg-[#F8FAFC] transition"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canMint && (
            <button
              onClick={() => setShowMintModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F2A43] hover:bg-[#1F5A7A] text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <PlusCircle className="w-4 h-4" />
              Mint Security Token
            </button>
          )}
        </div>
      </div>

      {/* Grid: Tokens & Holders / Traceability */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Token List */}
        <div className="lg:col-span-6 bg-white border border-[#D8E0E8] rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-[#D8E0E8] bg-[#F8FAFC] flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#0F2A43] uppercase tracking-wider">
              Issued Token Assets ({tokens.length})
            </h3>
            <span className="text-[10px] text-[#5A6A7E]">Select token to inspect balances</span>
          </div>
          <div className="divide-y divide-[#D8E0E8] max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-[#5A6A7E]">Loading tokens from ledger...</div>
            ) : tokens.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#5A6A7E]">
                No tokenized assets issued on chaincode yet.
              </div>
            ) : (
              tokens.map((tok) => {
                const isSelected = selectedToken?.id === tok.id;
                const supply = tok.totalUnits || tok.totalSupply || 0;
                const label = tok.unitLabel || tok.symbol || 'UNITS';

                return (
                  <button
                    key={tok.id}
                    onClick={() => handleSelectToken(tok)}
                    className={`w-full text-left p-4 transition ${
                      isSelected ? 'bg-[#F0F4F8] border-l-4 border-l-[#0F2A43]' : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#0F2A43] font-mono">{tok.id}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-[#E2E8F0] text-[#0F2A43] rounded font-semibold">
                          {tok.standard || 'FRACTIONAL'}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-[#1F5A7A] font-semibold bg-white px-2 py-0.5 rounded border border-[#D8E0E8]">
                        Supply: {Number(supply).toLocaleString()} {label}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#5A6A7E] flex items-center justify-between mt-2">
                      <span>Underlying: <strong className="font-mono text-[#17202A]">{tok.assetId}</strong></span>
                      <span className={`text-[10px] font-bold ${tok.status === 'ACTIVE' ? 'text-[#18794E]' : 'text-[#B42318]'}`}>
                        ● {tok.status}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Token Details & Cap Table */}
        <div className="lg:col-span-6 space-y-4">
          {selectedToken ? (
            <div className="bg-white border border-[#D8E0E8] rounded-xl p-5 shadow-2xs space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#0F2A43] font-mono">{selectedToken.id}</h3>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                    selectedToken.status === 'ACTIVE'
                      ? 'bg-[#F0FDF4] text-[#18794E] border-[#DCFCE7]'
                      : 'bg-[#FEF2F2] text-[#B42318] border-[#FECDD3]'
                  }`}>
                    {selectedToken.status}
                  </span>
                </div>
                <p className="text-xs text-[#5A6A7E] mt-1">
                  {selectedToken.representation || 'Undivided economic rights'}
                </p>
              </div>

              {/* Core metrics */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#D8E0E8]">
                  <div className="text-[10px] text-[#5A6A7E] font-bold uppercase">Total Authorized Supply</div>
                  <div className="font-mono text-sm font-bold text-[#0F2A43] mt-0.5">
                    {Number(selectedToken.totalUnits || selectedToken.totalSupply || 0).toLocaleString()} {selectedToken.unitLabel || selectedToken.symbol || 'UNITS'}
                  </div>
                </div>
                <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#D8E0E8]">
                  <div className="text-[10px] text-[#5A6A7E] font-bold uppercase">Collateralized Asset</div>
                  <div className="font-mono text-xs font-semibold text-[#1F5A7A] mt-1 truncate">
                    {selectedToken.assetId}
                  </div>
                </div>
              </div>

              {/* Cap Table Holders */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#0F2A43] uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#1F5A7A]" />
                    On-Chain Cap Table / Holdings ({holders.length})
                  </h4>
                  <button
                    onClick={() => handleSelectToken(selectedToken)}
                    className="text-[10px] text-[#1F5A7A] hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingHolders ? 'animate-spin' : ''}`} />
                    Refresh Balances
                  </button>
                </div>

                {loadingHolders ? (
                  <div className="p-4 text-center text-xs text-[#5A6A7E]">Querying ledger balance state...</div>
                ) : holders.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#5A6A7E] bg-[#F8FAFC] rounded-lg border border-[#D8E0E8]">
                    No active token holder records found.
                  </div>
                ) : (
                  <div className="border border-[#D8E0E8] rounded-lg overflow-hidden divide-y divide-[#D8E0E8] text-xs">
                    {holders.map((h, i) => {
                      const participantId = h.participantId || h.holderId || 'UNKNOWN';
                      const unitsHeld = h.units !== undefined ? h.units : (h.balance || 0);
                      const totalSupply = selectedToken.totalUnits || selectedToken.totalSupply || 1;
                      const percentage = ((unitsHeld / totalSupply) * 100).toFixed(1);

                      return (
                        <div key={i} className="p-3 flex items-center justify-between bg-white hover:bg-[#F8FAFC] transition">
                          <div>
                            <span className="font-mono font-semibold text-[#0F2A43]">{participantId}</span>
                            <div className="text-[10px] text-[#5A6A7E] mt-0.5">Holding: {percentage}% of supply</div>
                          </div>
                          <span className="font-bold font-mono text-[#17202A] text-sm">
                            {Number(unitsHeld).toLocaleString()} <span className="text-xs text-[#5A6A7E] font-normal">{selectedToken.unitLabel || selectedToken.symbol || 'UNITS'}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-[#5A6A7E] bg-white border border-[#D8E0E8] rounded-xl">
              Select a token to view cap table holdings and on-chain balance breakdown.
            </div>
          )}
        </div>
      </div>

      {/* Mint Modal */}
      {showMintModal && (
        <div className="fixed inset-0 z-50 bg-[#0F2A43]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8E0E8] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#D8E0E8]">
              <h3 className="text-sm font-bold text-[#0F2A43]">Mint Security Token</h3>
              <button
                onClick={() => setShowMintModal(false)}
                className="p-1 hover:bg-[#F0F4F8] rounded text-[#5A6A7E] transition"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[#5A6A7E]">
              Issue tokenized legal claims on the ledger against verified, valued underlying assets.
            </p>
            <form onSubmit={handleMint} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Target Valued Asset ID</label>
                <input
                  type="text"
                  placeholder="e.g. AST-123..."
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">Standard</label>
                  <select
                    value={standard}
                    onChange={(e) => setStandard(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg bg-white"
                  >
                    <option value="FRACTIONAL">FRACTIONAL</option>
                    <option value="WHOLE">WHOLE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">Total Units</label>
                  <input
                    type="number"
                    value={totalUnits}
                    onChange={(e) => setTotalUnits(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">Unit Label</label>
                  <input
                    type="text"
                    value={unitLabel}
                    onChange={(e) => setUnitLabel(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono"
                    placeholder="e.g. SQM / UNITS"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">Rights Type</label>
                  <select
                    value={rightsType}
                    onChange={(e) => setRightsType(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg bg-white"
                  >
                    <option value="UNDIVIDED_FRACTION">UNDIVIDED_FRACTION</option>
                    <option value="FULL_OWNERSHIP">FULL_OWNERSHIP</option>
                    <option value="RECEIVABLE_CLAIM">RECEIVABLE_CLAIM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Representation Statement</label>
                <textarea
                  value={representation}
                  onChange={(e) => setRepresentation(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg"
                  rows={2}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMintModal(false)}
                  className="px-4 py-2 border border-[#D8E0E8] rounded-lg text-[#5A6A7E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMint}
                  className="px-4 py-2 bg-[#0F2A43] text-white rounded-lg font-semibold hover:bg-[#1F5A7A]"
                >
                  {submittingMint ? 'Minting on Chain...' : 'Mint Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
