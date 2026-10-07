import React, { useEffect, useState } from 'react';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { api } from '../../shared/services/api.js';
import { StatusBadge } from '../../shared/components/StatusBadge.jsx';
import { HashChip } from '../../shared/components/HashChip.jsx';
import { MoneyDisplay } from '../../shared/components/MoneyDisplay.jsx';
import {
  Layers,
  Coins,
  ArrowRightLeft,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';

export function DashboardView({ onNavigate }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalAssets: 0,
    totalTokens: 0,
    totalTransfers: 0,
    blockHeight: 1,
    recentEntries: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.getExplorer();
      if (res?.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch explorer stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 md:p-8">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Phase 0 Foundation Active</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Welcome, {user?.name}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Consortium workspace initialized for <span className="text-indigo-400 font-semibold">{user?.mspId}</span> with role <span className="text-indigo-400 font-semibold">{user?.role}</span>. All actions are cryptographically signed, governed by chaincode rules, and auditable across 6 consortium member organizations.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Registered Assets</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalAssets}</div>
          <div className="text-[11px] text-slate-500">Land & Vehicle Passports</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Active Tokens</span>
            <Coins className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalTokens}</div>
          <div className="text-[11px] text-slate-500">Whole & Fractional Units</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Ledger Transfers</span>
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalTransfers}</div>
          <div className="text-[11px] text-slate-500">Rule-evaluated & Recorded</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Fabric Block Height</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400 font-mono">#{stats.blockHeight}</div>
          <div className="text-[11px] text-emerald-400">Consensus in sync</div>
        </div>
      </div>

      {/* Role-Specific Directives */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Capabilities for {user?.role}
          </h3>
          <ul className="text-xs text-slate-300 space-y-2.5">
            {user?.role === 'ADMINISTRATOR' && (
              <>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5" />
                  <span>Configure dynamic asset types (VEHICLE, LAND, and INVOICE extensible definitions)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5" />
                  <span>Manage consortium member organizations and issue user credentials</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5" />
                  <span>Enforce segregation of duties: Admin cannot self-verify or self-transfer assets</span>
                </li>
              </>
            )}

            {user?.role === 'ISSUER' && (
              <>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
                  <span>Register real-world assets with metadata and supporting document evidence</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
                  <span>Upload encrypted evidence (RC, Title deeds, survey maps) with SHA-256 integrity proofs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
                  <span>Submit asset packages for independent verification by accredited verifiers</span>
                </li>
              </>
            )}

            {user?.role === 'VERIFIER' && (
              <>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5" />
                  <span>Inspect asset evidence and record pass/fail results against type checklists</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5" />
                  <span>Request changes or approve verified state with non-repudiable verifier signature</span>
                </li>
              </>
            )}

            {user?.role === 'VALUER' && (
              <>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5" />
                  <span>Propose valuations using configured methods (Depreciated Cost, Market Comparable, Circle Rate)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5" />
                  <span>Maker-checker enforcement: Valuer proposes, Compliance / second valuer approves</span>
                </li>
              </>
            )}

            {user?.role === 'COMPLIANCE' && (
              <>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5" />
                  <span>Approve participant KYC status and manage jurisdiction / investor class limits</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5" />
                  <span>Approve token minting requests and co-endorse asset lifecycle state transitions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5" />
                  <span>Enforce regulatory freezes or holds on non-compliant assets</span>
                </li>
              </>
            )}

            {user?.role === 'INVESTOR' && (
              <>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5" />
                  <span>Hold whole or fractional real-world asset tokens with verifiable ledger proofs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5" />
                  <span>Propose peer-to-peer transfers subject to on-chain compliance rules</span>
                </li>
              </>
            )}

            {user?.role === 'AUDITOR' && (
              <>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5" />
                  <span>Read-only inspection access over public and consortium private data collections</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5" />
                  <span>Examine full transaction histories, rejected transfer reason codes, and drift reports</span>
                </li>
              </>
            )}
          </ul>
        </div>

        {/* Live Immutable Audit Stream */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              Latest Ledger Actions
            </h3>
            <button
              onClick={fetchStats}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Refresh
            </button>
          </div>

          <div className="space-y-3">
            {stats.recentEntries.length === 0 ? (
              <div className="text-xs text-slate-500 py-6 text-center">
                Genesis block initialized. No user mutations yet.
              </div>
            ) : (
              stats.recentEntries.slice(0, 5).map((entry, idx) => (
                <div key={idx} className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">
                      {entry.actorRole} ({entry.actorOrg})
                    </span>
                    <StatusBadge status={entry.toState} />
                  </div>
                  <div className="text-slate-400 text-[11px] truncate">{entry.reasonText}</div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/50 text-[10px] text-slate-500">
                    <span>Block #{entry.blockNumber}</span>
                    <HashChip hash={entry.txId} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
