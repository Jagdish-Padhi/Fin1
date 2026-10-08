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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D8E0E8]">
        <div>
          <h2 className="text-xl font-bold text-[#0F2A43] flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#1F5A7A]" />
            Asset Lifecycle Governance
          </h2>
          <p className="text-xs text-[#5A6A7E] mt-1">
            Permissioned state-machine transitions: emergency freeze, quarantine, reinstatement, and terminal retirement.
          </p>
        </div>
      </div>

      {!canManageLifecycle && (
        <div className="flex items-center gap-2.5 p-4 bg-[#FEF2F2] border border-[#FECDD3] rounded-xl text-xs text-[#B42318]">
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
            <div className="bg-white border border-[#D8E0E8] rounded-xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-[#A16207]">
                <Snowflake className="w-5 h-5" />
                <h3 className="font-bold text-sm text-[#0F2A43]">Emergency Freeze</h3>
              </div>
              <p className="text-xs text-[#5A6A7E] leading-relaxed">
                Suspends all secondary token transfers and collateral operations immediately upon court order or fraud suspicion.
              </p>
              <button
                onClick={handleFreeze}
                disabled={!!loadingAction || !canManageLifecycle}
                className="w-full py-2 bg-[#FEFCE8] hover:bg-[#FEF9C3] text-[#A16207] border border-[#FEF08A] rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loadingAction === 'freeze' ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Freezing...</>
                ) : (
                  <><Snowflake className="w-3.5 h-3.5" /> Freeze Asset</>
                )}
              </button>
            </div>

            {/* Unfreeze Panel */}
            <div className="bg-white border border-[#D8E0E8] rounded-xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-[#18794E]">
                <Sun className="w-5 h-5" />
                <h3 className="font-bold text-sm text-[#0F2A43]">Reinstate / Unfreeze</h3>
              </div>
              <p className="text-xs text-[#5A6A7E] leading-relaxed">
                Restores normal token operations after formal regulatory resolution or KYC clearance on ledger.
              </p>
              <button
                onClick={handleUnfreeze}
                disabled={!!loadingAction || !canManageLifecycle}
                className="w-full py-2 bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#18794E] border border-[#BBF7D0] rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loadingAction === 'unfreeze' ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Reinstating...</>
                ) : (
                  <><Sun className="w-3.5 h-3.5" /> Lift Freeze</>
                )}
              </button>
            </div>

            {/* Retire Panel */}
            <div className="bg-white border border-[#D8E0E8] rounded-xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-[#B42318]">
                <Archive className="w-5 h-5" />
                <h3 className="font-bold text-sm text-[#0F2A43]">Terminal Retirement</h3>
              </div>
              <p className="text-xs text-[#5A6A7E] leading-relaxed">
                Permanently burns outstanding token supplies upon physical asset liquidation, maturity, or principal repayment.
              </p>
              <button
                onClick={handleRetireRequest}
                disabled={!!loadingAction || !canManageLifecycle}
                className="w-full py-2 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B42318] border border-[#FECACA] rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          <div className="bg-white border border-[#D8E0E8] rounded-xl p-6 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-[#0F2A43] uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#A16207]" />
              Action Parameters &amp; Institutional Justification
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Target Asset ID *</label>
                <input
                  type="text"
                  placeholder="e.g. ASSET-IN-BLR-001 or select from list →"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono focus:outline-none focus:border-[#1F5A7A]"
                />
              </div>

              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">Retirement Reason Code (if retiring)</label>
                <select
                  value={retireCode}
                  onChange={(e) => setRetireCode(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg bg-white focus:outline-none focus:border-[#1F5A7A]"
                >
                  <option value="ASSET_LIQUIDATED">ASSET_LIQUIDATED — Underlying physical asset sold</option>
                  <option value="BOND_MATURED">BOND_MATURED — Principal fully repaid</option>
                  <option value="LEGAL_DISSOLUTION">LEGAL_DISSOLUTION — Entity legally dissolved</option>
                </select>
              </div>

              <div>
                <label className="block text-[#5A6A7E] font-medium mb-1">
                  Institutional Justification * <span className="text-[10px] text-[#8795A5]">(Recorded immutably on ledger)</span>
                </label>
                <textarea
                  rows="3"
                  placeholder="Detailed compliance justification entered into tamper-proof audit trail. Court case number, regulatory authority, and date..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg focus:outline-none focus:border-[#1F5A7A] resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Asset Quick-Select */}
        <div className="bg-white border border-[#D8E0E8] rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 bg-[#F8FAFC] border-b border-[#D8E0E8]">
            <h3 className="text-xs font-bold text-[#0F2A43] uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#1F5A7A]" />
              Active / Frozen Assets
            </h3>
            <p className="text-[10px] text-[#5A6A7E] mt-1">Click to pre-fill Asset ID</p>
          </div>
          <div className="p-3 border-b border-[#D8E0E8]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8795A5]" />
              <input
                type="text"
                placeholder="Search assets..."
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#D8E0E8] rounded-lg focus:outline-none focus:border-[#1F5A7A] bg-white"
              />
            </div>
          </div>
          <div className="divide-y divide-[#F1F5F9] max-h-[400px] overflow-y-auto">
            {loadingAssets ? (
              <div className="p-6 text-center text-xs text-[#5A6A7E]">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-[#1F5A7A]" />
                Loading assets...
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#5A6A7E]">
                No tokenized or frozen assets found.
              </div>
            ) : (
              filteredAssets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => setAssetId(asset.id)}
                  className={`w-full text-left p-3 hover:bg-[#F8FAFC] transition text-xs ${
                    assetId === asset.id ? 'bg-[#F0F4F8] border-l-4 border-l-[#1F5A7A]' : ''
                  }`}
                >
                  <div className="font-mono font-bold text-[#0F2A43] text-[11px]">{asset.id}</div>
                  <div className="text-[10px] text-[#5A6A7E] mt-0.5 truncate">{asset.displayName}</div>
                  <div className="mt-1">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        asset.status === 'FROZEN'
                          ? 'bg-[#FEFCE8] text-[#A16207]'
                          : asset.status === 'TOKENIZED'
                          ? 'bg-[#F0FDF4] text-[#18794E]'
                          : 'bg-[#F0F4F8] text-[#1F5A7A]'
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
