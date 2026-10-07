import React, { useState } from 'react';
import { api } from '../../shared/services/api.js';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import {
  Activity,
  Snowflake,
  Sun,
  Archive,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

export function LifecycleView() {
  const { user } = useAuth();
  const [assetId, setAssetId] = useState('');
  const [reason, setReason] = useState('');
  const [retireCode, setRetireCode] = useState('ASSET_LIQUIDATED');
  const [loadingAction, setLoadingAction] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const canManageLifecycle = user?.role === 'COMPLIANCE' || user?.role === 'ADMINISTRATOR';

  const handleFreeze = async () => {
    if (!assetId || !reason) {
      alert('Asset ID and justification reason are required.');
      return;
    }
    try {
      setLoadingAction(true);
      await api.freezeAsset(assetId, reason);
      setStatusMessage({ type: 'success', text: `Asset ${assetId} has been successfully frozen on ledger.` });
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Freeze action failed' });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleUnfreeze = async () => {
    if (!assetId || !reason) {
      alert('Asset ID and justification reason are required.');
      return;
    }
    try {
      setLoadingAction(true);
      await api.unfreezeAsset(assetId, reason);
      setStatusMessage({ type: 'success', text: `Asset ${assetId} restriction lifted successfully.` });
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Unfreeze action failed' });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRetire = async () => {
    if (!assetId || !reason) {
      alert('Asset ID and justification reason are required.');
      return;
    }
    if (!confirm(`Permanently retire ${assetId}? This action burns remaining tokens and is non-reversible.`)) {
      return;
    }
    try {
      setLoadingAction(true);
      await api.retireAsset(assetId, retireCode, reason);
      setStatusMessage({ type: 'success', text: `Asset ${assetId} has been permanently retired.` });
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Retire action failed' });
    } finally {
      setLoadingAction(false);
    }
  };

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
            Permissioned state-machine transitions: emergency freeze, quarantine, unfreeze, and terminal retirement.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#18794E]'
              : 'bg-[#FEF2F2] border-[#FECACA] text-[#B42318]'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Control Console */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Freeze Panel */}
        <div className="bg-white border border-[#D8E0E8] rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 text-[#A16207]">
            <Snowflake className="w-5 h-5" />
            <h3 className="font-bold text-sm text-[#0F2A43]">Emergency Freeze</h3>
          </div>
          <p className="text-xs text-[#5A6A7E] leading-relaxed">
            Suspends all secondary token transfers, redemption, and collateral operations immediately upon suspicion of fraud or court order.
          </p>
          <button
            onClick={handleFreeze}
            disabled={loadingAction || !canManageLifecycle}
            className="w-full py-2 bg-[#FEFCE8] hover:bg-[#FEF9C3] text-[#A16207] border border-[#FEF08A] rounded-lg text-xs font-semibold transition"
          >
            Freeze Asset
          </button>
        </div>

        {/* Unfreeze Panel */}
        <div className="bg-white border border-[#D8E0E8] rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 text-[#18794E]">
            <Sun className="w-5 h-5" />
            <h3 className="font-bold text-sm text-[#0F2A43]">Reinstate / Unfreeze</h3>
          </div>
          <p className="text-xs text-[#5A6A7E] leading-relaxed">
            Restores normal token operations after formal regulatory resolution or KYC clearance is verified on ledger.
          </p>
          <button
            onClick={handleUnfreeze}
            disabled={loadingAction || !canManageLifecycle}
            className="w-full py-2 bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#18794E] border border-[#BBF7D0] rounded-lg text-xs font-semibold transition"
          >
            Lift Freeze
          </button>
        </div>

        {/* Retire Panel */}
        <div className="bg-white border border-[#D8E0E8] rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 text-[#B42318]">
            <Archive className="w-5 h-5" />
            <h3 className="font-bold text-sm text-[#0F2A43]">Terminal Retirement</h3>
          </div>
          <p className="text-xs text-[#5A6A7E] leading-relaxed">
            Permanently burns outstanding token supplies upon physical asset liquidation, maturity, or total payoff.
          </p>
          <button
            onClick={handleRetire}
            disabled={loadingAction || !canManageLifecycle}
            className="w-full py-2 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B42318] border border-[#FECACA] rounded-lg text-xs font-semibold transition"
          >
            Retire Asset Permanently
          </button>
        </div>
      </div>

      {/* Inputs Form */}
      <div className="bg-white border border-[#D8E0E8] rounded-xl p-6 shadow-2xs max-w-2xl space-y-4">
        <h3 className="text-xs font-bold text-[#0F2A43] uppercase tracking-wider">
          Action Parameters & Institutional Justification
        </h3>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[#5A6A7E] font-medium mb-1">Target Asset ID</label>
            <input
              type="text"
              placeholder="e.g. ASSET-IN-BLR-001"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg font-mono"
            />
          </div>

          <div>
            <label className="block text-[#5A6A7E] font-medium mb-1">Retirement Reason Code (if retiring)</label>
            <select
              value={retireCode}
              onChange={(e) => setRetireCode(e.target.value)}
              className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg bg-white"
            >
              <option value="ASSET_LIQUIDATED">ASSET_LIQUIDATED (Underlying sold)</option>
              <option value="BOND_MATURED">BOND_MATURED (Principal repaid)</option>
              <option value="LEGAL_DISSOLUTION">LEGAL_DISSOLUTION (Entity dissolved)</option>
            </select>
          </div>

          <div>
            <label className="block text-[#5A6A7E] font-medium mb-1">Justification Reason</label>
            <textarea
              rows="3"
              placeholder="Detailed justification recorded into consortium audit ledger..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-[#D8E0E8] rounded-lg focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
