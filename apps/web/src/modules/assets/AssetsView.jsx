import React, { useState, useEffect } from 'react';
import { api } from '../../shared/services/api.js';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { RegisterAssetWizard } from './RegisterAssetWizard.jsx';
import { AssetDetailDrawer } from './AssetDetailDrawer.jsx';
import { AssetPassportStickerModal } from './AssetPassportStickerModal.jsx';
import { StatusBadge } from '../../shared/components/StatusBadge.jsx';
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
  ChevronRight,
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

  const canRegister = user?.role === 'ISSUER';

  const stats = {
    total: assets.length,
    registered: assets.filter((a) => a.status === 'REGISTERED').length,
    inVerification: assets.filter((a) => a.status === 'UNDER_VERIFICATION').length,
    verified: assets.filter((a) => a.status === 'VERIFIED' || a.status === 'TOKENIZED').length,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#D8E0E8]">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2A43] tracking-tight font-['Outfit',sans-serif]">
            Real-World Assets
          </h1>
          <p className="text-xs text-[#5A6A7E] mt-0.5">
            Cryptographically anchored asset passports with dual-rail Merkle evidence trees
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadAssets}
            disabled={loading}
            className="p-2 rounded-xl bg-white border border-[#D8E0E8] text-[#5A6A7E] hover:text-[#0F2A43] hover:bg-[#F8FAFC] transition shadow-2xs"
            title="Refresh asset registry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0F766E]' : ''}`} />
          </button>

          {canRegister && (
            <button
              onClick={() => setShowWizard(true)}
              className="py-2 px-4 rounded-xl bg-[#0F2A43] hover:bg-[#0A1E30] text-white text-xs font-semibold flex items-center gap-2 transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Register Real Asset
            </button>
          )}
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="trust-card p-4 space-y-1">
          <div className="text-[10px] uppercase font-bold text-[#5A6A7E] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#1F5A7A]" />
            Total Assets
          </div>
          <div className="text-2xl font-extrabold text-[#0F2A43]">{stats.total}</div>
        </div>

        <div className="trust-card p-4 space-y-1">
          <div className="text-[10px] uppercase font-bold text-[#5A6A7E] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#0F766E]" />
            Draft / Registered
          </div>
          <div className="text-2xl font-extrabold text-[#0F766E]">{stats.registered}</div>
        </div>

        <div className="trust-card p-4 space-y-1">
          <div className="text-[10px] uppercase font-bold text-[#5A6A7E] flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-[#A16207]" />
            In Verification
          </div>
          <div className="text-2xl font-extrabold text-[#A16207]">{stats.inVerification}</div>
        </div>

        <div className="trust-card p-4 space-y-1">
          <div className="text-[10px] uppercase font-bold text-[#5A6A7E] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#18794E]" />
            Verified & Tokenized
          </div>
          <div className="text-2xl font-extrabold text-[#18794E]">{stats.verified}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="trust-card p-3 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#8795A5] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Asset ID, Display Name, Jurisdiction..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#F8FAFC] border border-[#D8E0E8] text-xs text-[#17202A] placeholder-[#8795A5] focus:outline-none focus:border-[#1F5A7A] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#D8E0E8] text-xs text-[#17202A] focus:outline-none focus:border-[#1F5A7A]"
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
            className="px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#D8E0E8] text-xs text-[#17202A] focus:outline-none focus:border-[#1F5A7A]"
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
        <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECDD3] text-xs text-[#B42318] flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Asset Directory Table */}
      <div className="trust-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#D8E0E8] text-[#5A6A7E] uppercase font-bold text-[10px] tracking-wider">
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
            <tbody className="divide-y divide-[#E8EEF3]">
              {loading && assets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-[#5A6A7E]">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#0F766E]" />
                      <span>Reading Real-World Asset passports...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-[#5A6A7E]">
                    No matching assets found in consortium world state.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="hover:bg-[#F8FAFC] transition group cursor-pointer"
                    onClick={() => setSelectedAssetId(asset.id)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#F0F4F8] border border-[#D8E0E8] flex items-center justify-center text-[#0F2A43] shrink-0 group-hover:bg-[#0F2A43] group-hover:text-white transition">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-[#0F2A43] group-hover:text-[#0F766E] transition">
                            {asset.displayName}
                          </div>
                          <div className="font-mono text-[10px] text-[#5A6A7E]">{asset.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F0F4F8] text-[#1F5A7A] border border-[#D8E0E8]">
                        {asset.typeKey}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={asset.status} />
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#5A6A7E]">
                      {asset.evidenceRoot ? (
                        <span className="text-[#0F766E] font-medium truncate block max-w-[120px]">
                          {asset.evidenceRoot.substring(0, 10)}...
                        </span>
                      ) : (
                        <span className="text-[#8795A5]">Pending</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[#17202A] text-[11px] font-medium">
                      {asset.issuerId || 'N/A'}
                    </td>

                    <td className="py-3.5 px-4 text-[#5A6A7E] text-[11px]">
                      {asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setStickerAsset(asset)}
                          className="p-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#1F5A7A] border border-[#D8E0E8] transition shadow-2xs"
                          title="View Digital Passport Sticker"
                        >
                          <QrCode className="w-3.5 h-3.5 text-[#0F766E]" />
                        </button>
                        <button
                          onClick={() => setSelectedAssetId(asset.id)}
                          className="p-1.5 rounded-lg bg-[#F0F4F8] hover:bg-[#E2E8F0] text-[#0F2A43] border border-[#D8E0E8] transition"
                          title="View Passport Details"
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
