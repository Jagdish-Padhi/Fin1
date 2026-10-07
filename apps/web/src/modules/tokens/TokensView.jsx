import React, { useState, useEffect } from 'react';
import { api } from '../../shared/services/api.js';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import {
  Coins,
  PlusCircle,
  Users,
  Search,
  ExternalLink,
  Layers,
  FileBadge,
  CheckCircle2,
} from 'lucide-react';

export function TokensView() {
  const { user } = useAuth();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedToken, setSelectedToken] = useState(null);
  const [holders, setHolders] = useState([]);
  const [loadingHolders, setLoadingHolders] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);
  const [submittingMint, setSubmittingMint] = useState(false);

  // Mint Form State
  const [assetId, setAssetId] = useState('');
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [totalSupply, setTotalSupply] = useState(100000);
  const [decimals, setDecimals] = useState(0);
  const [initialHolder, setInitialHolder] = useState('PARTICIPANT-ISSUER-001');

  const canMint = user?.role === 'COMPLIANCE' || user?.role === 'ADMINISTRATOR';

  const loadTokens = async () => {
    try {
      setLoading(true);
      const res = await api.getTokens();
      setTokens(res.data || []);
      if (res.data?.length > 0 && !selectedToken) {
        handleSelectToken(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load tokens:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectToken = async (tok) => {
    setSelectedToken(tok);
    try {
      setLoadingHolders(true);
      const res = await api.getTokenHolders(tok.id);
      setHolders(res.data || []);
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
        symbol: symbol.toUpperCase(),
        name,
        totalSupply: Number(totalSupply),
        decimals: Number(decimals),
        initialHolder,
      });
      setShowMintModal(false);
      await loadTokens();
    } catch (err) {
      alert(err.message || 'Token minting failed. Check asset verification & compliance.');
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
            Fractional digital security tokens anchored directly to verified physical real-world assets on rwa-channel.
          </p>
        </div>

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

      {/* Grid: Tokens & Holders / Traceability */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Token List */}
        <div className="lg:col-span-6 bg-white border border-[#D8E0E8] rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-[#D8E0E8] bg-[#F8FAFC]">
            <h3 className="text-xs font-bold text-[#0F2A43] uppercase tracking-wider">
              Issued Token Assets ({tokens.length})
            </h3>
          </div>
          <div className="divide-y divide-[#D8E0E8] max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-[#5A6A7E]">Loading tokens...</div>
            ) : tokens.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#5A6A7E]">
                No tokenized assets issued on chaincode yet.
              </div>
            ) : (
              tokens.map((tok) => {
                const isSelected = selectedToken?.id === tok.id;
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
                        <span className="font-bold text-xs text-[#0F2A43]">{tok.symbol}</span>
                        <span className="text-[11px] text-[#5A6A7E] truncate">{tok.name}</span>
                      </div>
                      <span className="font-mono text-[10px] text-[#1F5A7A] font-semibold bg-white px-2 py-0.5 rounded border border-[#D8E0E8]">
                        Supply: {Number(tok.totalSupply).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#5A6A7E] flex items-center justify-between mt-2">
                      <span>Underlying: <strong className="font-mono text-[#17202A]">{tok.assetId}</strong></span>
                      <span className="text-[#18794E] font-medium">Minted on rwa-channel</span>
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
                  <h3 className="text-base font-bold text-[#0F2A43]">{selectedToken.name}</h3>
                  <span className="px-2.5 py-1 bg-[#F0FDF4] text-[#18794E] border border-[#DCFCE7] rounded-md text-xs font-bold">
                    {selectedToken.symbol}
                  </span>
                </div>
                <p className="text-xs text-[#5A6A7E] font-mono mt-0.5">Token ID: {selectedToken.id}</p>
              </div>

              {/* Core metrics */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#D8E0E8]">
                  <div className="text-[10px] text-[#5A6A7E] font-bold uppercase">Total Authorized Supply</div>
                  <div className="font-mono text-sm font-bold text-[#0F2A43] mt-0.5">
                    {Number(selectedToken.totalSupply).toLocaleString()}
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
                <h4 className="text-xs font-bold text-[#0F2A43] uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#1F5A7A]" />
                  Ledger Cap Table / Holders ({holders.length})
                </h4>

                {loadingHolders ? (
                  <div className="p-4 text-center text-xs text-[#5A6A7E]">Querying state trie...</div>
                ) : holders.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#5A6A7E] bg-[#F8FAFC] rounded-lg border border-[#D8E0E8]">
                    No secondary token holder records found.
                  </div>
                ) : (
                  <div className="border border-[#D8E0E8] rounded-lg overflow-hidden divide-y divide-[#D8E0E8] text-xs">
                    {holders.map((h, i) => (
                      <div key={i} className="p-2.5 flex items-center justify-between bg-white hover:bg-[#F8FAFC]">
                        <span className="font-mono text-[#0F2A43]">{h.holderId}</span>
                        <span className="font-bold font-mono text-[#17202A]">
                          {Number(h.balance).toLocaleString()} {selectedToken.symbol}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-[#5A6A7E] bg-white border border-[#D8E0E8] rounded-xl">
              Select a token to view cap table holdings and traceability.
            </div>
          )}
        </div>
      </div>

      {/* Mint Modal */}
      {showMintModal && (
        <div className="fixed inset-0 z-50 bg-[#0F2A43]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8E0E8] rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-[#0F2A43]">Mint Fractional Security Token</h3>
            <p className="text-xs text-[#5A6A7E]">
              Segregation of duties: Co-signed by Compliance Officer upon verification & valuation sign-off.
            </p>
            <form onSubmit={handleMint} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Target Asset ID</label>
                <input
                  type="text"
                  placeholder="e.g. ASSET-IN-BLR-001"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">Token Symbol</label>
                  <input
                    type="text"
                    placeholder="e.g. BLR-TECH"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg uppercase font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#5A6A7E] font-medium mb-1">Total Supply</label>
                  <input
                    type="number"
                    value={totalSupply}
                    onChange={(e) => setTotalSupply(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Token Security Name</label>
                <input
                  type="text"
                  placeholder="e.g. BLR Tech Park Fractional Share"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Initial Holder ID</label>
                <input
                  type="text"
                  value={initialHolder}
                  onChange={(e) => setInitialHolder(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono"
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
