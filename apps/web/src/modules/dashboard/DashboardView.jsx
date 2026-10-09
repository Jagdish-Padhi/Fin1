import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { api } from '../../shared/services/api.js';
import { HashChip } from '../../shared/components/HashChip.jsx';
import {
  Layers,
  Coins,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Building,
  FileCheck,
  TrendingUp,
  Activity,
  History,
  Users,
  ShieldCheck,
  XCircle,
  Inbox,
} from 'lucide-react';

const settledList = (result) =>
  result.status === 'fulfilled' && Array.isArray(result.value?.data)
    ? result.value.data
    : [];

function isPendingKyc(p) {
  return p?.kycStatus === 'SUBMITTED' || p?.kycStatus === 'UNDER_REVIEW';
}

function isStaleValuation(v) {
  if (!v) return false;
  if (v.status === 'EXPIRED') return true;
  if (!v.validUntil) return false;
  return new Date(v.validUntil).getTime() < Date.now();
}

function getRoleCounters(role, data, onNavigate) {
  const { assets, tokens, transfers, participants, valuations, cases, types, explorer } = data;
  const link = (tab) => (onNavigate ? () => onNavigate(tab) : undefined);

  switch (role) {
    case 'ADMINISTRATOR': {
      const pendingKyc = participants.filter(isPendingKyc).length;
      const activeTypes = types.filter((t) => (t.status || 'ACTIVE') !== 'DEPRECATED').length;
      return [
        {
          key: 'pending-kyc',
          label: 'Pending KYC Review',
          value: pendingKyc,
          sub: 'Across consortium participants',
          icon: Users,
          tone: 'amber',
          onClick: link('participants'),
        },
        {
          key: 'asset-types',
          label: 'Active Asset Types',
          value: activeTypes,
          sub: 'Versioned schemas in force',
          icon: Building,
          tone: 'teal',
          onClick: link('asset-types'),
        },
        {
          key: 'participants',
          label: 'Registered Participants',
          value: participants.length,
          sub: 'Identities anchored on ledger',
          icon: ShieldCheck,
          tone: 'navy',
          onClick: link('participants'),
        },
      ];
    }
    case 'ISSUER': {
      const actionNeeded = assets.filter((a) =>
        ['REGISTERED', 'CHANGES_REQUESTED', 'REJECTED', 'DRAFT'].includes(a.status)
      ).length;
      const inVerification = assets.filter((a) => a.status === 'UNDER_VERIFICATION').length;
      const pendingOffers = transfers.filter((t) =>
        ['PROPOSED', 'PENDING_COMPLIANCE', 'PENDING'].includes(t.status)
      ).length;
      const ready = assets.filter((a) =>
        ['VERIFIED', 'VALUED', 'TOKENIZED'].includes(a.status)
      ).length;
      return [
        {
          key: 'action-needed',
          label: 'Action Needed',
          value: actionNeeded,
          sub: 'Draft / changes requested / rejected',
          icon: Clock,
          tone: 'amber',
          onClick: link('assets'),
        },
        {
          key: 'investment-offers',
          label: 'Investment Offers',
          value: pendingOffers,
          sub: 'Investor requests awaiting review',
          icon: Inbox,
          tone: 'navy',
          onClick: link('investment-offers'),
        },
        {
          key: 'in-verification',
          label: 'In Verification',
          value: inVerification,
          sub: 'With independent verifiers',
          icon: FileCheck,
          tone: 'navy',
          onClick: link('assets'),
        },
        {
          key: 'ready',
          label: 'Verified & Tokenized',
          value: ready,
          sub: 'Ready for valuation / mint',
          icon: CheckCircle2,
          tone: 'green',
          onClick: link('assets'),
        },
      ];
    }
    case 'VERIFIER': {
      const open = cases.filter((c) =>
        ['OPEN', 'IN_PROGRESS', 'PENDING', 'UNDER_REVIEW'].includes(c.status)
      ).length;
      const approved = cases.filter((c) => c.status === 'APPROVED').length;
      const rejected = cases.filter((c) =>
        ['REJECTED', 'CHANGES_REQUESTED'].includes(c.status)
      ).length;
      return [
        {
          key: 'open-queue',
          label: 'Open Audit Queue',
          value: open,
          sub: 'Cases awaiting your checks',
          icon: FileCheck,
          tone: 'navy',
          onClick: link('verification'),
        },
        {
          key: 'approved',
          label: 'Approved',
          value: approved,
          sub: 'Signed off by you / pool',
          icon: CheckCircle2,
          tone: 'green',
          onClick: link('verification'),
        },
        {
          key: 'returned',
          label: 'Rejected / Changes Asked',
          value: rejected,
          sub: 'Closed with findings',
          icon: XCircle,
          tone: 'red',
          onClick: link('verification'),
        },
      ];
    }
    case 'VALUER': {
      const proposed = valuations.filter((v) => v.status === 'PROPOSED').length;
      const approved = valuations.filter((v) => v.status === 'APPROVED').length;
      const stale = valuations.filter(isStaleValuation).length;
      return [
        {
          key: 'awaiting-cert',
          label: 'Awaiting Certification',
          value: proposed,
          sub: 'With compliance officers',
          icon: Clock,
          tone: 'amber',
          onClick: link('valuation'),
        },
        {
          key: 'certified',
          label: 'Certified',
          value: approved,
          sub: 'Approved NAV on ledger',
          icon: CheckCircle2,
          tone: 'green',
          onClick: link('valuation'),
        },
        {
          key: 'stale',
          label: 'Expired / Stale',
          value: stale,
          sub: 'Needs revaluation',
          icon: TrendingUp,
          tone: 'red',
          onClick: link('valuation'),
        },
      ];
    }
    case 'COMPLIANCE': {
      const toCertify = valuations.filter((v) => v.status === 'PROPOSED').length;
      const awaitingSettlement = transfers.filter((t) =>
        ['PROPOSED', 'PENDING_COMPLIANCE', 'PENDING'].includes(t.status)
      ).length;
      const rejected = transfers.filter((t) => t.status === 'REJECTED').length;
      return [
        {
          key: 'to-certify',
          label: 'Valuations to Certify',
          value: toCertify,
          sub: 'Maker-checker queue',
          icon: TrendingUp,
          tone: 'amber',
          onClick: link('valuation'),
        },
        {
          key: 'awaiting-settlement',
          label: 'Transfers Awaiting Decision',
          value: awaitingSettlement,
          sub: 'Proposed / escalated',
          icon: ArrowRightLeft,
          tone: 'navy',
          onClick: link('transfers'),
        },
        {
          key: 'rejected',
          label: 'Rejected Transfers',
          value: rejected,
          sub: 'First-class audit records',
          icon: XCircle,
          tone: 'red',
          onClick: link('transfers'),
        },
      ];
    }
    case 'INVESTOR': {
      const activeTokens = tokens.filter((t) => (t.status || 'ACTIVE') === 'ACTIVE').length;
      const proposed = transfers.filter((t) =>
        ['PROPOSED', 'PENDING_COMPLIANCE', 'PENDING'].includes(t.status)
      ).length;
      const settled = transfers.filter((t) => t.status === 'EXECUTED').length;
      return [
        {
          key: 'tokens',
          label: 'Active Token Offerings',
          value: activeTokens,
          sub: 'Whole & fractional',
          icon: Coins,
          tone: 'teal',
          onClick: link('assets'),
        },
        {
          key: 'pending',
          label: 'Pending Offers',
          value: proposed,
          sub: 'Awaiting issuer response',
          icon: Clock,
          tone: 'amber',
          onClick: link('invest'),
        },
        {
          key: 'settled',
          label: 'Settled Investments',
          value: settled,
          sub: 'Executed on ledger',
          icon: CheckCircle2,
          tone: 'green',
          onClick: link('invest'),
        },
      ];
    }
    case 'AUDITOR': {
      const txCount = explorer?.txCount ?? explorer?.totalTransactions ?? transfers.length;
      return [
        {
          key: 'assets',
          label: 'Assets Tracked',
          value: assets.length,
          sub: 'Passports on channel',
          icon: Layers,
          tone: 'navy',
          onClick: link('assets'),
        },
        {
          key: 'tokens',
          label: 'Tokens Issued',
          value: tokens.length,
          sub: 'Traceable to collateral',
          icon: Coins,
          tone: 'teal',
          onClick: link('assets'),
        },
        {
          key: 'commits',
          label: 'Ledger Transactions',
          value: txCount,
          sub: 'Committed & auditable',
          icon: Activity,
          tone: 'green',
          onClick: link('audit'),
        },
      ];
    }
    default: {
      const awaiting = transfers.filter((t) =>
        ['PROPOSED', 'PENDING_COMPLIANCE', 'PENDING'].includes(t.status)
      ).length;
      return [
        {
          key: 'assets',
          label: 'Registered Assets',
          value: assets.length,
          sub: 'Anchored passports',
          icon: Layers,
          tone: 'navy',
          onClick: link('assets'),
        },
        {
          key: 'tokens',
          label: 'Tokenized Securities',
          value: tokens.length,
          sub: 'Whole & fractional',
          icon: Coins,
          tone: 'teal',
          onClick: link('assets'),
        },
        {
          key: 'pending',
          label: 'Pending Transfers',
          value: awaiting,
          sub: 'Awaiting settlement',
          icon: ArrowRightLeft,
          tone: 'amber',
          onClick: link('transfers'),
        },
      ];
    }
  }
}

const toneStyles = {
  navy: { chip: 'bg-[#F0F4F8] text-[#1F5A7A]', value: 'text-[#0F2A43]' },
  teal: { chip: 'bg-[#F0FDFA] text-[#0F766E]', value: 'text-[#0F766E]' },
  green: { chip: 'bg-[#F0FDF4] text-[#18794E]', value: 'text-[#18794E]' },
  amber: { chip: 'bg-[#FEFCE8] text-[#A16207]', value: 'text-[#A16207]' },
  red: { chip: 'bg-[#FEF2F2] text-[#B42318]', value: 'text-[#B42318]' },
};

export function DashboardView({ onNavigate }) {
  const { user } = useAuth();
  const role = user?.role || 'ADMINISTRATOR';
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    assets: [],
    tokens: [],
    transfers: [],
    participants: [],
    valuations: [],
    cases: [],
    types: [],
    explorer: null,
    recentEntries: [],
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [
        explorerRes,
        assetsRes,
        tokensRes,
        transfersRes,
        participantsRes,
        valuationsRes,
        casesRes,
        typesRes,
      ] = await Promise.allSettled([
        api.getExplorer(),
        api.getAssets(),
        api.getTokens(),
        api.getTransfers(),
        api.getParticipants(),
        api.getValuations(),
        api.getVerificationCases(),
        api.getAssetTypes(),
      ]);
      if (cancelled) return;
      const explorerData =
        explorerRes.status === 'fulfilled' ? explorerRes.value?.data ?? null : null;
      setData({
        assets: settledList(assetsRes),
        tokens: settledList(tokensRes),
        transfers: settledList(transfersRes),
        participants: settledList(participantsRes),
        valuations: settledList(valuationsRes),
        cases: settledList(casesRes),
        types: settledList(typesRes),
        explorer: explorerData,
        recentEntries:
          explorerData?.recentEntries && Array.isArray(explorerData.recentEntries)
            ? explorerData.recentEntries
            : [],
      });
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const counters = useMemo(() => getRoleCounters(role, data, onNavigate), [role, data, onNavigate]);

  return (
    <div className="space-y-6">
      {/* Role-specific operational counters */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {counters.map((c) => {
            const Icon = c.icon;
            const tone = toneStyles[c.tone] || toneStyles.navy;
            const clickable = typeof c.onClick === 'function';
            return (
              <div
                key={c.key}
                onClick={c.onClick}
                className={`trust-card p-5 space-y-2 transition ${
                  clickable ? 'cursor-pointer hover:border-[#1F5A7A] group' : ''
                }`}
              >
                <div className="flex items-center justify-between text-[#5A6A7E]">
                  <span className="text-xs font-bold uppercase tracking-wider">{c.label}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`p-2 rounded-lg ${tone.chip}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {clickable && (
                      <ArrowUpRight className="w-4 h-4 text-[#8795A5] group-hover:text-[#0F2A43] transition" />
                    )}
                  </div>
                </div>
                <div className={`text-2xl font-extrabold ${tone.value}`}>
                  {loading ? '—' : c.value}
                </div>
                <div className="text-[11px] text-[#5A6A7E]">{c.sub}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Ledger Audit Trail (unchanged) */}
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
              {data.recentEntries && data.recentEntries.length > 0 ? (
                data.recentEntries.slice(0, 6).map((entry, idx) => (
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
