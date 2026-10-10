import React, { useState, useEffect } from 'react';
import { api } from '../../shared/services/api.js';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { useToast } from '../../shared/components/Toast.jsx';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog.jsx';
import {
  Activity,
  Snowflake,
  Sun,
  Archive,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Layers,
  Search,
  ShieldAlert,
} from 'lucide-react';

export function LifecycleView() {
  const { user } = useAuth();
  const toast = useToast();

  const [assetId, setAssetId] = useState('');
  const [reason, setReason] = useState('');
  const [retireCode, setRetireCode] = useState('ASSET_LIQUIDATED');
  const [loadingAction, setLoadingAction] = useState(null); // null | 'freeze' | 'unfreeze' | 'retire'

  // Retire confirmation
  const [showRetireConfirm, setShowRetireConfirm] = useState(false);

  // Assets list for quick selection
  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [assetSearch, setAssetSearch] = useState('');

  const canManageLifecycle = user?.role === 'COMPLIANCE' || user?.role === 'ADMINISTRATOR';

  useEffect(() => {
    const loadAssets = async () => {
      try {
        const res = await api.getAssets();
        setAssets(res.data || []);
      } catch {
        // non-critical
      } finally {
        setLoadingAssets(false);
      }
    };
    loadAssets();
  }, []);

  const validate = () => {
    if (!assetId.trim()) {
      toast.warning('Please enter or select a Target Asset ID.');
      return false;
    }
    if (!reason.trim()) {
      toast.warning('An institutional justification reason is required and will be recorded on ledger.');
      return false;
    }
    return true;
  };

  const handleFreeze = async () => {
    if (!validate()) return;
    try {
      setLoadingAction('freeze');
      await api.freezeAsset(assetId.trim(), reason);
      toast.success(`Asset ${assetId} has been successfully frozen. All token transfers suspended on ledger.`);
    } catch (err) {
      toast.error(err.message || 'Emergency freeze action failed. Check asset status.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUnfreeze = async () => {
    if (!validate()) return;
    try {
      setLoadingAction('unfreeze');
      await api.unfreezeAsset(assetId.trim(), reason);
      toast.success(`Asset ${assetId} freeze restriction lifted. Token operations restored.`);
    } catch (err) {
      toast.error(err.message || 'Unfreeze action failed. Check asset status.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRetireRequest = () => {
    if (!validate()) return;
    setShowRetireConfirm(true);
  };

  const handleRetireConfirmed = async () => {
    setShowRetireConfirm(false);
    try {
      setLoadingAction('retire');
      await api.retireAsset(assetId.trim(), retireCode, reason);
      toast.success(`Asset ${assetId} permanently retired. Outstanding token supply has been burned on-chain.`);
      setAssetId('');
      setReason('');
    } catch (err) {
      toast.error(err.message || 'Terminal retirement failed. Check asset state.');
    } finally {
      setLoadingAction(null);
    }
  };

  const tokenizableAssets = assets.filter((a) =>
    ['TOKENIZED', 'VERIFIED', 'FROZEN'].includes(a.status)
  );

  const filteredAssets = tokenizableAssets.filter(
    (a) =>
      !assetSearch ||
      a.id?.toLowerCase().includes(assetSearch.toLowerCase()) ||
      a.displayName?.toLowerCase().includes(assetSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">
            Asset Lifecycle Governance
          </h2>
          <p className="page-subtitle">
            Permissioned state-machine transitions: emergency freeze, quarantine, reinstatement, and terminal retirement.
          </p>
        </div>
      </div>

      {!canManageLifecycle && (
        <div className="flex items-center gap-2.5 p-4 bg-trust-error-bg border border-trust-error-border rounded-lg text-xs text-trust-error">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>
            <strong>Access Restricted.</strong> Lifecycle governance actions are restricted to Compliance Officers.
            Your role ({user?.role}) does not have permission to execute these transitions.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Action Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Action Panels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Freeze Panel */}
            <div className="bg-white border border-trust-border rounded-lg p-5 shadow-subtle space-y-3">
              <div className="flex items-center gap-2 text-trust-warning">
                <Snowflake className="w-5 h-5" />
                <h3 className="font-semibold text-sm text-trust-primary">Emergency Freeze</h3>
              </div>
              <p className="text-xs text-trust-text-muted leading-relaxed">
                Suspends all secondary token transfers and collateral operations immediately upon court order or fraud suspicion.
              </p>
              <button
                onClick={handleFreeze}
                disabled={!!loadingAction || !canManageLifecycle}
                className="w-full py-2 bg-trust-warning-bg hover:bg-[#FEF9C3] text-trust-warning border border-trust-warning-border rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loadingAction === 'freeze' ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Freezing...</>
                ) : (
                  <><Snowflake className="w-3.5 h-3.5" /> Freeze Asset</>
                )}
              </button>
            </div>

            {/* Unfreeze Panel */}
            <div className="bg-white border border-trust-border rounded-lg p-5 shadow-subtle space-y-3">
              <div className="flex items-center gap-2 text-trust-success">
                <Sun className="w-5 h-5" />
                <h3 className="font-semibold text-sm text-trust-primary">Reinstate / Unfreeze</h3>
              </div>
              <p className="text-xs text-trust-text-muted leading-relaxed">
                Restores normal token operations after formal regulatory resolution or KYC clearance on ledger.
              </p>
              <button
                onClick={handleUnfreeze}
                disabled={!!loadingAction || !canManageLifecycle}
                className="w-full py-2 bg-trust-success-bg hover:bg-[#DCFCE7] text-trust-success border border-trust-success-border rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loadingAction === 'unfreeze' ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Reinstating...</>
                ) : (
                  <><Sun className="w-3.5 h-3.5" /> Lift Freeze</>
                )}
              </button>
            </div>

            {/* Retire Panel */}
            <div className="bg-white border border-trust-border rounded-lg p-5 shadow-subtle space-y-3">
              <div className="flex items-center gap-2 text-trust-error">
                <Archive className="w-5 h-5" />
                <h3 className="font-semibold text-sm text-trust-primary">Terminal Retirement</h3>
              </div>
              <p className="text-xs text-trust-text-muted leading-relaxed">
                Permanently burns outstanding token supplies upon physical asset liquidation, maturity, or principal repayment.
              </p>
              <button
                onClick={handleRetireRequest}
                disabled={!!loadingAction || !canManageLifecycle}
                className="w-full py-2 bg-trust-error-bg hover:bg-[#FEE2E2] text-trust-error border border-[#FECACA] rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loadingAction === 'retire' ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Retiring...</>
                ) : (
                  <><Archive className="w-3.5 h-3.5" /> Retire Permanently</>
                )}
              </button>
            </div>
          </div>

          {/* Input Parameters Form */}
          <div className="bg-white border border-trust-border rounded-lg p-6 shadow-subtle space-y-4">
            <h3 className="text-xs font-semibold text-trust-primary flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-trust-warning" />
              Action Parameters &amp; Institutional Justification
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-trust-text-muted font-medium mb-1">Target Asset ID *</label>
                <input
                  type="text"
                  placeholder="e.g. ASSET-IN-BLR-001 or select from list →"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="trust-input w-full font-mono"
                />
              </div>

              <div>
                <label className="block text-trust-text-muted font-medium mb-1">Retirement Reason Code (if retiring)</label>
                <select
                  value={retireCode}
                  onChange={(e) => setRetireCode(e.target.value)}
                  className="trust-input w-full"
                >
                  <option value="ASSET_LIQUIDATED">ASSET_LIQUIDATED — Underlying physical asset sold</option>
                  <option value="BOND_MATURED">BOND_MATURED — Principal fully repaid</option>
                  <option value="LEGAL_DISSOLUTION">LEGAL_DISSOLUTION — Entity legally dissolved</option>
                </select>
              </div>

              <div>
                <label className="block text-trust-text-muted font-medium mb-1">
                  Institutional Justification * <span className="text-xs text-trust-text-subtle">(Recorded immutably on ledger)</span>
                </label>
                <textarea
                  rows="3"
                  placeholder="Detailed compliance justification entered into tamper-proof audit trail. Court case number, regulatory authority, and date..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="trust-input w-full resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Asset Quick-Select */}
        <div className="bg-white border border-trust-border rounded-lg overflow-hidden shadow-subtle">
          <div className="p-4 bg-slate-50 border-b border-trust-border">
            <h3 className="text-xs font-semibold text-trust-primary flex items-center gap-2">
              <Layers className="w-4 h-4 text-trust-secondary" />
              Active / Frozen Assets
            </h3>
            <p className="text-xs text-trust-text-muted mt-1">Click to pre-fill Asset ID</p>
          </div>
          <div className="p-3 border-b border-trust-border">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-trust-text-subtle" />
              <input
                type="text"
                placeholder="Search assets..."
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                className="trust-input w-full pl-8 pr-3"
              />
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {loadingAssets ? (
              <div className="p-6 text-center text-xs text-trust-text-muted">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-trust-secondary" />
                Loading assets...
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="p-6 text-center text-xs text-trust-text-muted">
                No tokenized or frozen assets found.
              </div>
            ) : (
              filteredAssets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => setAssetId(asset.id)}
                  className={`w-full text-left p-3 hover:bg-slate-50 transition text-xs ${
                    assetId === asset.id ? 'bg-slate-100 border-l-4 border-l-[#1F5A7A]' : ''
                  }`}
                >
                  <div className="font-mono font-semibold text-trust-primary text-xs">{asset.id}</div>
                  <div className="text-xs text-trust-text-muted mt-0.5 truncate">{asset.displayName}</div>
                  <div className="mt-1">
                    <span
                      className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                        asset.status === 'FROZEN'
                          ? 'bg-trust-warning-bg text-trust-warning'
                          : asset.status === 'TOKENIZED'
                          ? 'bg-trust-success-bg text-trust-success'
                          : 'bg-slate-100 text-trust-secondary'
                      }`}
                    >
                      {asset.status}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Retire Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRetireConfirm}
        title="Permanently Retire Asset"
        message={`Retire asset ${assetId} with reason code "${retireCode}"? This action will burn all outstanding token supply and is PERMANENTLY IRREVERSIBLE on the ledger.`}
        confirmLabel="Yes, Retire Permanently"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleRetireConfirmed}
        onCancel={() => setShowRetireConfirm(false)}
      />
    </div>
  );
}
