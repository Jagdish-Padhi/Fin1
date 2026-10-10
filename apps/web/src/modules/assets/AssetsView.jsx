import React, { useState, useEffect } from 'react';
import { api } from '../../shared/services/api.js';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { RegisterAssetWizard } from './RegisterAssetWizard.jsx';
import { AssetDetailDrawer } from './AssetDetailDrawer.jsx';
import { AssetPassportStickerModal } from './AssetPassportStickerModal.jsx';
import { InvestorAssetsView } from './InvestorAssetsView.jsx';
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

export function AssetsView({ onNavigate }) {
  const { user } = useAuth();
  if (user?.role === 'INVESTOR') return <InvestorAssetsView onNavigate={onNavigate} />;
  return <AssetRegistryView user={user} />;
}

function AssetRegistryView({ user }) {
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
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Real-World Assets
          </h1>
          <p className="page-subtitle">
            Cryptographically anchored asset passports with dual-rail Merkle evidence trees
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadAssets}
            disabled={loading}
            className="trust-btn-secondary !px-2.5"
            title="Refresh asset registry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-trust-accent' : ''}`} />
          </button>

          {canRegister && (
            <button
              onClick={() => setShowWizard(true)}
              className="trust-btn-primary"
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
          <div className="text-xs font-semibold text-trust-text-muted flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-trust-secondary" />
            Total Assets
          </div>
          <div className="text-2xl font-semibold tabular-nums text-trust-primary">{stats.total}</div>
        </div>

        <div className="trust-card p-4 space-y-1">
          <div className="text-xs font-semibold text-trust-text-muted flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-trust-accent" />
            Draft / Registered
          </div>
          <div className="text-2xl font-semibold tabular-nums text-trust-primary">{stats.registered}</div>
        </div>

        <div className="trust-card p-4 space-y-1">
          <div className="text-xs font-semibold text-trust-text-muted flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-trust-warning" />
            In Verification
          </div>
          <div className="text-2xl font-semibold tabular-nums text-trust-primary">{stats.inVerification}</div>
        </div>

        <div className="trust-card p-4 space-y-1">
          <div className="text-xs font-semibold text-trust-text-muted flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-trust-success" />
            Verified & Tokenized
          </div>
          <div className="text-2xl font-semibold tabular-nums text-trust-primary">{stats.verified}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="trust-card p-3 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-trust-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Asset ID, Display Name, Jurisdiction..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="trust-input w-full pl-9 pr-4"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="trust-input"
          >
            <option value="ALL">All Types</option>
            <option value="VEHICLE">Vehicle</option>
            <option value="REAL_ESTATE">Real estate</option>
            <option value="INVOICE">Invoice</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="trust-input"
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
        <div className="p-3.5 rounded-lg bg-trust-error-bg border border-trust-error-border text-xs text-trust-error flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Asset Directory Table */}
      <div className="trust-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 border-b border-trust-border text-trust-text-muted font-medium text-xs">
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
            <tbody className="divide-y divide-trust-border-subtle">
              {loading && assets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-trust-text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-trust-accent" />
                      <span>Reading Real-World Asset passports...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-trust-text-muted">
                    No matching assets found in consortium world state.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="hover:bg-slate-50 transition group cursor-pointer"
                    onClick={() => setSelectedAssetId(asset.id)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-trust-border flex items-center justify-center text-trust-primary shrink-0 group-hover:bg-trust-primary group-hover:text-white transition">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-trust-primary group-hover:text-trust-accent transition">
                            {asset.displayName}
                          </div>
                          <div className="font-mono text-xs text-trust-text-muted">{asset.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-trust-secondary border border-trust-border">
                        {asset.typeKey}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={asset.status} />
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs text-trust-text-muted">
                      {asset.evidenceRoot ? (
                        <span className="text-trust-accent font-medium truncate block max-w-[120px]">
                          {asset.evidenceRoot.substring(0, 10)}...
                        </span>
                      ) : (
                        <span className="text-trust-text-subtle">Pending</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-trust-text text-xs font-medium">
                      {asset.issuerId || 'N/A'}
                    </td>

                    <td className="py-3.5 px-4 text-trust-text-muted text-xs">
                      {asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setStickerAsset(asset)}
                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-trust-secondary border border-trust-border transition shadow-subtle"
                          title="View Digital Passport Sticker"
                        >
                          <QrCode className="w-3.5 h-3.5 text-trust-accent" />
                        </button>
                        <button
                          onClick={() => setSelectedAssetId(asset.id)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-trust-border-subtle text-trust-primary border border-trust-border transition"
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
