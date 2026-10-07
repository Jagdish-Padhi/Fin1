import React, { useState, useEffect } from 'react';
import { api } from '../../shared/services/api.js';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { RegisterAssetWizard } from './RegisterAssetWizard.jsx';
import { AssetDetailDrawer } from './AssetDetailDrawer.jsx';
import { AssetPassportStickerModal } from './AssetPassportStickerModal.jsx';
import {
  Layers,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ShieldCheck,
  FileCheck,
  QrCode,
  Building,
  CheckCircle2,
  Clock,
  Coins,
  ChevronRight,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

export function AssetsView() {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals & Drawers
  const [showWizard, setShowWizard] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [stickerAsset, setStickerAsset] = useState(null);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAssets();
      if (res?.data) {
        setAssets(res.data);
      }
    } catch (err) {
      console.error('Failed to load assets:', err);
      setError(err?.response?.data?.error?.message || err.message || 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      !searchQuery ||
      asset.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.jurisdiction?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'ALL' || asset.typeKey === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || asset.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const canRegister = user?.role === 'ISSUER' || user?.role === 'ADMINISTRATOR';

  const stats = {
    total: assets.length,
    registered: assets.filter((a) => a.status === 'REGISTERED').length,
    inVerification: assets.filter((a) => a.status === 'UNDER_VERIFICATION').length,
    verified: assets.filter((a) => a.status === 'VERIFIED' || a.status === 'TOKENIZED').length,
  };

  const statusBadges = {
    REGISTERED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    UNDER_VERIFICATION: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    VERIFIED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    REJECTED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    TOKENIZED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Real World Assets</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Phase 2 Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographically anchored asset passports with dual-rail Merkle evidence trees
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAssets}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Refresh asset registry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          {canRegister && (
            <button
              onClick={() => setShowWizard(true)}
              className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              Register Real Asset
            </button>
          )}
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Total Assets
          </div>
          <div className="text-xl font-bold text-white">{stats.total}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            Draft / Registered
          </div>
          <div className="text-xl font-bold text-indigo-400">{stats.registered}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-amber-400" />
            In Verification
          </div>
          <div className="text-xl font-bold text-amber-400">{stats.inVerification}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Verified & Tokenized
          </div>
          <div className="text-xl font-bold text-emerald-400">{stats.verified}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Asset ID, Display Name, Jurisdiction..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Types</option>
            <option value="REAL_ESTATE">Real Estate</option>
            <option value="INVOICE">Trade Invoice</option>
            <option value="COMMODITY">Commodity Batch</option>
            <option value="VEHICLE">Fleet Vehicle</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="REGISTERED">Registered</option>
            <option value="UNDER_VERIFICATION">Under Verification</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
            <option value="TOKENIZED">Tokenized</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Asset Table / Directory */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Asset Name & ID</th>
                <th className="py-3 px-4">Asset Class</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Evidence Root</th>
                <th className="py-3 px-4">Issuer Org</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300 font-medium">
              {loading && assets.length === 0 ? (
                <tr>
                  <td colPositions="7" className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                      <span>Loading Real World Assets...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    No matching assets found.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="hover:bg-slate-800/40 transition group cursor-pointer"
                    onClick={() => setSelectedAssetId(asset.id)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-indigo-400 transition">
                            {asset.displayName}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">{asset.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                        {asset.typeKey}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                          statusBadges[asset.status] ||
                          'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {asset.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {asset.evidenceRoot ? (
                        <span className="text-indigo-400 truncate block max-w-[120px]">
                          {asset.evidenceRoot.substring(0, 10)}...
                        </span>
                      ) : (
                        <span className="text-slate-600">Pending</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      {asset.issuerId || 'N/A'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setStickerAsset(asset)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                          title="View Digital Passport Sticker"
                        >
                          <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                        </button>
                        <button
                          onClick={() => setSelectedAssetId(asset.id)}
                          className="p-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 transition"
                          title="View Details"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals & Slide-over Drawer */}
      <RegisterAssetWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onCreated={() => {
          setShowWizard(false);
          loadAssets();
        }}
        user={user}
      />

      <AssetDetailDrawer
        isOpen={Boolean(selectedAssetId)}
        onClose={() => setSelectedAssetId(null)}
        assetId={selectedAssetId}
        user={user}
        onAssetUpdated={loadAssets}
      />

      <AssetPassportStickerModal
        isOpen={Boolean(stickerAsset)}
        onClose={() => setStickerAsset(null)}
        asset={stickerAsset}
      />
    </div>
  );
}
