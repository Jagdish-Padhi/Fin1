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
  navy: 'bg-slate-100 text-trust-secondary',
  teal: 'bg-teal-50 text-trust-accent',
  green: 'bg-emerald-50 text-trust-success',
  amber: 'bg-amber-50 text-trust-warning',
  red: 'bg-red-50 text-trust-error',
};

const ROLE_LABELS = {
  ADMINISTRATOR: 'Administrator',
  ISSUER: 'Issuer',
  VERIFIER: 'Verifier',
  VALUER: 'Valuer',
  COMPLIANCE: 'Compliance officer',
  INVESTOR: 'Investor',
  AUDITOR: 'Auditor',
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
      <div className="page-header !mb-0">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {ROLE_LABELS[role] || role} workspace. Items below need attention or summarize your current activity.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {counters.map((c) => {
          const Icon = c.icon;
          const tone = toneStyles[c.tone] || toneStyles.navy;
          const clickable = typeof c.onClick === 'function';
          const Wrapper = clickable ? 'button' : 'div';
          return (
            <Wrapper
              key={c.key}
              onClick={c.onClick}
              className={`trust-card p-5 text-left w-full ${
                clickable ? 'trust-card-hover cursor-pointer group' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-trust-text-muted">{c.label}</span>
                <span className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${tone}`}>
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 text-3xl font-semibold tabular-nums text-trust-primary">
                {loading ? <span className="text-trust-text-subtle">—</span> : c.value}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-trust-text-muted">
                <span>{c.sub}</span>
                {clickable && (
                  <ArrowUpRight className="w-3.5 h-3.5 text-trust-text-subtle group-hover:text-trust-primary" />
                )}
              </div>
            </Wrapper>
          );
        })}
      </div>

      <section className="trust-card overflow-hidden">
        <div className="px-5 py-4 border-b border-trust-border">
          <h2 className="text-base font-semibold text-trust-text">Recent ledger activity</h2>
          <p className="text-sm text-trust-text-muted mt-0.5">Latest transactions committed to the consortium channel.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Entity type</th>
                <th>Entity ID</th>
                <th>Action</th>
                <th>Transaction</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {data.recentEntries && data.recentEntries.length > 0 ? (
                data.recentEntries.slice(0, 6).map((entry, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className="tag">{entry.entityType || 'TRANSACTION'}</span>
                    </td>
                    <td className="font-mono text-xs text-trust-text">{entry.entityId}</td>
                    <td className="font-medium text-trust-text">{entry.action}</td>
                    <td>
                      <HashChip hash={entry.txId} />
                    </td>
                    <td className="text-trust-text-muted whitespace-nowrap">
                      {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : 'Recent'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-trust-text-muted">
                    No ledger activity yet. Transactions will appear here once committed.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
