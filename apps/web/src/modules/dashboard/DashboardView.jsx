import React, { useEffect, useState } from 'react';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { api } from '../../shared/services/api.js';
import { StatusBadge } from '../../shared/components/StatusBadge.jsx';
import { HashChip } from '../../shared/components/HashChip.jsx';
import {
  Layers,
  Coins,
  ArrowRightLeft,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Building,
  UserCheck,
  FileCheck,
  TrendingUp,
  Activity,
  History,
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
    <div className="space-y-6">
      {/* Executive Welcome Banner */}
      <div className="trust-card p-6 bg-white border border-[#D8E0E8] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-bold text-[#0F2A43] tracking-tight font-['Outfit',sans-serif]">
            {user?.name}
          </h2>
          <p className="text-xs text-[#5A6A7E]">
            {user?.mspId} • Role: {user?.role} • rwa-channel
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="px-3.5 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#D8E0E8]">
            <span className="text-[10px] font-semibold text-[#5A6A7E] uppercase block">Ledger Height</span>
            <span className="text-xs font-bold font-mono text-[#0F2A43]">Block #{stats.blockHeight || 1}</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="trust-card p-5 space-y-2 hover:border-[#BAC7D5] transition">
          <div className="flex items-center justify-between text-[#5A6A7E]">
            <span className="text-xs font-bold uppercase tracking-wider">Registered Assets</span>
            <div className="p-2 rounded-lg bg-[#F0F4F8] text-[#1F5A7A]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#0F2A43]">{stats.totalAssets}</div>
          <div className="text-[11px] text-[#5A6A7E]">Cryptographically Anchored Passports</div>
        </div>

        <div className="trust-card p-5 space-y-2 hover:border-[#BAC7D5] transition">
          <div className="flex items-center justify-between text-[#5A6A7E]">
            <span className="text-xs font-bold uppercase tracking-wider">Tokenized Securities</span>
            <div className="p-2 rounded-lg bg-[#F0FDFA] text-[#0F766E]">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#0F766E]">{stats.totalTokens}</div>
          <div className="text-[11px] text-[#5A6A7E]">Whole & Fractional Offerings</div>
        </div>

        <div className="trust-card p-5 space-y-2 hover:border-[#BAC7D5] transition">
          <div className="flex items-center justify-between text-[#5A6A7E]">
            <span className="text-xs font-bold uppercase tracking-wider">Rule Transfers</span>
            <div className="p-2 rounded-lg bg-[#F0F4F8] text-[#1F5A7A]">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#1F5A7A]">{stats.totalTransfers}</div>
          <div className="text-[11px] text-[#5A6A7E]">Compliance-Gated Settlements</div>
        </div>

        <div className="trust-card p-5 space-y-2 hover:border-[#BAC7D5] transition">
          <div className="flex items-center justify-between text-[#5A6A7E]">
            <span className="text-xs font-bold uppercase tracking-wider">Fabric Consensus</span>
            <div className="p-2 rounded-lg bg-[#F0FDF4] text-[#18794E]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#18794E]">Healthy</div>
          <div className="text-[11px] text-[#5A6A7E]">Raft Cluster Operational</div>
        </div>
      </div>

      {/* Role-Specific Action Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#0F2A43] uppercase tracking-wider">
            Governance Workflows ({user?.role})
          </h3>
          <span className="text-xs text-[#5A6A7E]">Direct Action Shortcuts</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => onNavigate('assets')}
            className="trust-card p-5 cursor-pointer hover:border-[#1F5A7A] transition group space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-[#F0F4F8] text-[#0F2A43] group-hover:bg-[#0F2A43] group-hover:text-white transition">
                <Layers className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#8795A5] group-hover:text-[#0F2A43] transition" />
            </div>
            <div className="text-sm font-bold text-[#0F2A43]">Real-World Asset Directory</div>
            <p className="text-xs text-[#5A6A7E]">
              Explore registered asset passports, dynamic schemas, and Merkle evidence vaults.
            </p>
          </div>

          <div
            onClick={() => onNavigate('participants')}
            className="trust-card p-5 cursor-pointer hover:border-[#1F5A7A] transition group space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-[#F0F4F8] text-[#1F5A7A] group-hover:bg-[#1F5A7A] group-hover:text-white transition">
                <Building className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#8795A5] group-hover:text-[#1F5A7A] transition" />
            </div>
            <div className="text-sm font-bold text-[#0F2A43]">Participant Directory & KYC</div>
            <p className="text-xs text-[#5A6A7E]">
              Manage participant eligibility, KYC verification workflows, and transfer limit caps.
            </p>
          </div>

          <div
            onClick={() => onNavigate('asset-types')}
            className="trust-card p-5 cursor-pointer hover:border-[#0F766E] transition group space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-[#F0FDFA] text-[#0F766E] group-hover:bg-[#0F766E] group-hover:text-white transition">
                <FileCheck className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#8795A5] group-hover:text-[#0F766E] transition" />
            </div>
            <div className="text-sm font-bold text-[#0F2A43]">Asset Type Engine</div>
            <p className="text-xs text-[#5A6A7E]">
              Inspect parametric attribute schemas, required evidence rules, and field privacy levels.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Ledger Audit Trail */}
      <div className="trust-card overflow-hidden">
        <div className="p-4 border-b border-[#D8E0E8] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#1F5A7A]" />
            <h3 className="text-xs font-bold text-[#0F2A43] uppercase tracking-wider">
              Recent Consortium Ledger Activity
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#5A6A7E]">Immutable Audit Feed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#D8E0E8] text-[#5A6A7E] uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Entity Type</th>
                <th className="py-2.5 px-4">Entity ID</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Tx Hash</th>
                <th className="py-2.5 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EEF3] text-[#17202A]">
              {stats.recentEntries && stats.recentEntries.length > 0 ? (
                stats.recentEntries.slice(0, 6).map((entry, idx) => (
                  <tr key={idx} className="hover:bg-[#F8FAFC] transition">
                    <td className="py-3 px-4 font-semibold text-[#0F2A43]">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F0F4F8] text-[#1F5A7A] border border-[#D8E0E8]">
                        {entry.entityType || 'TRANSACTION'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">{entry.entityId}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#0F766E]">{entry.action}</span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <HashChip hash={entry.txId} />
                    </td>
                    <td className="py-3 px-4 text-[#5A6A7E] text-[11px]">
                      {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : 'Recent'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-[#5A6A7E]">
                    Consortium channel initialized. Ready for transactions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
