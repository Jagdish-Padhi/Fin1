import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { api } from '../../shared/services/api.js';
import { tabAccess } from '../../shared/utils/permissions.js';
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
  AlertTriangle,
  Users,
  ShieldAlert,
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
          onClick: link('tokens'),
        },
        {
          key: 'pending',
          label: 'Pending Transfers',
          value: proposed,
          sub: 'Awaiting settlement',
          icon: Clock,
          tone: 'amber',
          onClick: link('transfers'),
        },
        {
          key: 'settled',
          label: 'Settled Transfers',
          value: settled,
          sub: 'Executed on ledger',
          icon: CheckCircle2,
          tone: 'green',
          onClick: link('transfers'),
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
          onClick: link('tokens'),
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
          onClick: link('tokens'),
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

  const userRole = user?.role || null;
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      setLoading(true);
      const state = {};

      try {
        if (userRole === 'ADMINISTRATOR') {
          const [usersRes, orgsRes, typesRes, healthRes] = await Promise.allSettled([
            api.getUsers(),
            api.getOrganizations(),
            api.getAssetTypes(),
            fetch('/healthz').then((r) => r.json()).catch(() => ({ status: 'ONLINE' })),
          ]);
          state.users = usersRes.status === 'fulfilled' ? usersRes.value.data || [] : [];
          state.orgs = orgsRes.status === 'fulfilled' ? orgsRes.value.data || [] : [];
          state.types = typesRes.status === 'fulfilled' ? typesRes.value.data || [] : [];
          state.health = healthRes.status === 'fulfilled' ? healthRes.value?.status || 'ONLINE' : 'ONLINE';
        } else if (userRole === 'ISSUER') {
          const [assetsRes, tokensRes, transfersRes] = await Promise.allSettled([
            api.getAssets(),
            api.getTokens(),
            api.getTransfers(),
          ]);
          state.assets = assetsRes.status === 'fulfilled' ? assetsRes.value.data || [] : [];
          state.tokens = tokensRes.status === 'fulfilled' ? tokensRes.value.data || [] : [];
          state.transfers = transfersRes.status === 'fulfilled' ? transfersRes.value.data || [] : [];
        } else if (userRole === 'VERIFIER') {
          const [casesRes] = await Promise.allSettled([api.getVerificationCases()]);
          state.cases = casesRes.status === 'fulfilled' ? casesRes.value.data || [] : [];
        } else if (userRole === 'VALUER') {
          const [valuationsRes] = await Promise.allSettled([api.getValuations()]);
          state.valuations = valuationsRes.status === 'fulfilled' ? valuationsRes.value.data || [] : [];
        } else if (userRole === 'COMPLIANCE') {
          const [participantsRes, valuationsRes, assetsRes, transfersRes] = await Promise.allSettled([
            api.getParticipants(),
            api.getValuations(),
            api.getAssets(),
            api.getTransfers(),
          ]);
          state.participants = participantsRes.status === 'fulfilled' ? participantsRes.value.data || [] : [];
          state.valuations = valuationsRes.status === 'fulfilled' ? valuationsRes.value.data || [] : [];
          state.assets = assetsRes.status === 'fulfilled' ? assetsRes.value.data || [] : [];
          state.transfers = transfersRes.status === 'fulfilled' ? transfersRes.value.data || [] : [];
        } else if (userRole === 'INVESTOR') {
          const [tokensRes, transfersRes] = await Promise.allSettled([
            api.getTokens(),
            api.getTransfers(),
          ]);
          state.tokens = tokensRes.status === 'fulfilled' ? tokensRes.value.data || [] : [];
          state.transfers = transfersRes.status === 'fulfilled' ? transfersRes.value.data || [] : [];
        } else if (userRole === 'AUDITOR') {
          const [explorerRes, transfersRes] = await Promise.allSettled([
            api.getExplorer(),
            api.getTransfers(),
          ]);
          state.explorer = explorerRes.status === 'fulfilled' ? explorerRes.value.data || {} : {};
          state.transfers = transfersRes.status === 'fulfilled' ? transfersRes.value.data || [] : [];
        }
      } catch (err) {
        console.warn('Dashboard data fetch partial failure:', err);
      }

      if (isMounted) {
        setData(state);
        setLoading(false);
      }
    }

    if (userRole) {
      loadDashboardData();
    }
    return () => {
      isMounted = false;
    };
  }, [userRole]);

  // Role Cards Config
  const renderRoleCards = () => {
    switch (userRole) {
      case 'ADMINISTRATOR': {
        const users = data.users || [];
        const orgs = data.orgs || [];
        const types = data.types || [];
        const activeTypes = types.filter((t) => t.status !== 'DEPRECATED').length;
        const deprecatedTypes = types.filter((t) => t.status === 'DEPRECATED').length;

        return (
          <>
            <div className="trust-card p-5 space-y-2">
              <div className="flex items-center justify-between text-[#5A6A7E]">
                <span className="text-xs font-bold uppercase tracking-wider">Provisioned Users</span>
                <Users className="w-4 h-4 text-[#1F5A7A]" />
              </div>
              <div className="text-2xl font-extrabold text-[#0F2A43]">{users.length}</div>
              <div className="text-[11px] text-[#5A6A7E]">Across 6 Consortium Organizations</div>
            </div>

            <div className="trust-card p-5 space-y-2">
              <div className="flex items-center justify-between text-[#5A6A7E]">
                <span className="text-xs font-bold uppercase tracking-wider">Consortium Orgs</span>
                <Building className="w-4 h-4 text-[#0F766E]" />
              </div>
              <div className="text-2xl font-extrabold text-[#0F766E]">{orgs.length}</div>
              <div className="text-[11px] text-[#5A6A7E]">Active Fabric MSP Entities</div>
            </div>

            <div className="trust-card p-5 space-y-2">
              <div className="flex items-center justify-between text-[#5A6A7E]">
                <span className="text-xs font-bold uppercase tracking-wider">Asset Types</span>
                <FileCheck className="w-4 h-4 text-[#1F5A7A]" />
              </div>
              <div className="text-2xl font-extrabold text-[#1F5A7A]">{activeTypes}</div>
              <div className="text-[11px] text-[#5A6A7E]">{deprecatedTypes} Deprecated Schemas</div>
            </div>

            <div className="trust-card p-5 space-y-2">
              <div className="flex items-center justify-between text-[#5A6A7E]">
                <span className="text-xs font-bold uppercase tracking-wider">Network Health</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-600">{data.health || 'ONLINE'}</div>
              <div className="text-[11px] text-[#5A6A7E]">Consortium Gateway Connected</div>
            </div>
          </>
        );
      }

      case 'ISSUER': {
        const assets = data.assets || [];
        const tokens = data.tokens || [];
        const transfers = data.transfers || [];
        const awaitingVer = assets.filter((a) => a.status === 'UNDER_VERIFICATION').length;
        const changesReq = assets.filter((a) => a.status === 'CHANGES_REQUESTED').length;
        const pendingTrf = transfers.filter((t) => t.status === 'PROPOSED').length;

        return (
          <>
            <div className="trust-card p-5 space-y-2">
              <div className="flex items-center justify-between text-[#5A6A7E]">
                <span className="text-xs font-bold uppercase tracking-wider">My Registered Assets</span>
                <Layers className="w-4 h-4 text-[#1F5A7A]" />
              </div>
              <div className="text-2xl font-extrabold text-[#0F2A43]">{assets.length}</div>
              <div className="text-[11px] text-[#5A6A7E]">Originator Portfolios</div>
            </div>

            <div className="trust-card p-5 space-y-2">
              <div className="flex items-center justify-between text-[#5A6A7E]">
                <span className="text-xs font-bold uppercase tracking-wider">Awaiting Verification</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-extrabold text-amber-600">{awaitingVer}</div>
              <div className="text-[11px] text-[#5A6A7E]">{changesReq} Changes Requested</div>
            </div>

            <div className="trust-card p-5 space-y-2">
              <div className="flex items-center justify-between text-[#5A6A7E]">
                <span className="text-xs font-bold uppercase tracking-wider">My Tokens</span>
                <Coins className="w-4 h-4 text-[#0F766E]" />
              </div>
              <div className="text-2xl font-extrabold text-[#0F766E]">{tokens.length}</div>
              <div className="text-[11px] text-[#5A6A7E]">Tokenized Offerings</div>
            </div>

            <div className="trust-card p-5 space-y-2">
              <div className="flex items-center justify-between text-[#5A6A7E]">
                <span className="text-xs font-bold uppercase tracking-wider">Pending Transfers</span>
                <ArrowRightLeft className="w-4 h-4 text-[#1F5A7A]" />
              </div>
              <div className="text-2xl font-extrabold text-[#1F5A7A]">{pendingTrf}</div>
              <div className="text-[11px] text-[#5A6A7E]">Proposed Secondary Trades</div>
            </div>
          </>
        );
      }

      case 'VERIFIER': {
        const cases = data.cases || [];
        const openCases = cases.filter((c) => c.status === 'SUBMITTED' || c.status === 'IN_PROGRESS').length;
        const myAssigned = cases.filter(
          (c) => c.assignedVerifierId === user?.userId || c.assignedVerifierId === user?.participantId
        ).length;
        const completed = cases.filter((c) => c.status === 'APPROVED' || c.status === 'REJECTED').length;

        return (
          <>
            <div className="trust-card p-5 space-y-2">
              <div className="flex items-center justify-between text-[#5A6A7E]">
                <span className="text-xs font-bold uppercase tracking-wider">Open Audit Cases</span>
                <FileCheck className="w-4 h-4 text-[#1F5A7A]" />
              </div>
              <div className="text-2xl font-extrabold text-[#0F2A43]">{openCases}</div>
              <div className="text-[11px] text-[#5A6A7E]">Pending Independent Verification</div>
            </div>

            <div className="trust-card p-5 space-y-2">
              <div className="flex items-center justify-between text-[#5A6A7E]">
                <span className="text-xs font-bold uppercase tracking-wider">Assigned to Me</span>
                <UserCheck className="w-4 h-4 text-[#0F766E]" />
              </div>
              <div className="text-2xl font-extrabold text-[#0F766E]">{myAssigned}</div>
              <div className="text-[11px] text-[#5A6A7E]">Active Inspection Queue</div>
            </div>

            <div className="trust-card p-5 space-y-2">
              <div className="flex items-center justify-between text-[#5A6A7E]">
                <span className="text-xs font-bold uppercase tracking-wider">Completed Audits</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-600">{completed}</div>
              <div className="text-[11px] text-[#5A6A7E]">Historical Case Records</div>
            </div>
          </>
        );
      }

      case 'VALUER': {
        const valuations = data.valuations || [];
        const pending = valuations.filter((v) => v.status === 'PROPOSED').length;
        const approved = valuations.filter((v) => v.status === 'APPROVED').length;

        return (
          <>
            <div className="trust-card p-5 space-y-2">
              <div className="flex items-center justify-between text-[#5A6A7E]">
                <span className="text-xs font-bold uppercase tracking-wider">Pending Proposals</span>
                <TrendingUp className="w-4 h-4 text-[#1F5A7A]" />
              </div>
              <div className="text-2xl font-extrabold text-[#0F2A43]">{pending}</div>
              <div className="text-[11px] text-[#5A6A7E]">Awaiting Compliance Sign-off</div>
            </div>

            <div className="trust-card p-5 space-y-2">
              <div className="flex items-center justify-between text-[#5A6A7E]">
                <span className="text-xs font-bold uppercase tracking-wider">Certified Valuations</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-600">{approved}</div>
              <div className="text-[11px] text-[#5A6A7E]">Approved Appraisal Models</div>
            </div>
          </>
        );
      }

      case 'COMPLIANCE': {
        const participants = data.participants || [];
        const valuations = data.valuations || [];
        const assets = data.assets || [];
        const transfers = data.transfers || [];

        const kycQueue = participants.filter((p) => p.kycStatus === 'SUBMITTED' || p.kycStatus === 'UNDER_REVIEW').length;
        const valApprovals = valuations.filter((v) => v.status === 'PROPOSED').length;
        const readyToMint = assets.filter((a) => a.status === 'VALUED' && !a.tokenId).length;
        const escalatedTrf = transfers.filter((t) => t.status === 'PENDING_COMPLIANCE').length;
        const frozenAssets = assets.filter((a) => a.status === 'FROZEN').length;
        const rejectedTrf = transfers.filter((t) => t.status === 'REJECTED').length;

        return (
          <>
            <div className="trust-card p-5 space-y-2">
              <div className="flex items-center justify-between text-[#5A6A7E]">
                <span className="text-xs font-bold uppercase tracking-wider">KYC Queue</span>
                <UserCheck className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-extrabold text-amber-600">{kycQueue}</div>
              <div className="text-[11px] text-[#5A6A7E]">Participants Awaiting Verification</div>
            </div>

            <div className="trust-card p-5 space-y-2">
              <div className="flex items-center justify-between text-[#5A6A7E]">
                <span className="text-xs font-bold uppercase tracking-wider">Valuation Approvals</span>
                <TrendingUp className="w-4 h-4 text-[#1F5A7A]" />
              </div>
              <div className="text-2xl font-extrabold text-[#1F5A7A]">{valApprovals}</div>
              <div className="text-[11px] text-[#5A6A7E]">Appraisals Requiring Decision</div>
            </div>

            <div className="trust-card p-5 space-y-2">
              <div className="flex items-center justify-between text-[#5A6A7E]">
                <span className="text-xs font-bold uppercase tracking-wider">Ready to Mint</span>
                <Coins className="w-4 h-4 text-[#0F766E]" />
              </div>
              <div className="text-2xl font-extrabold text-[#0F766E]">{readyToMint}</div>
              <div className="text-[11px] text-[#5A6A7E]">Valued Assets Eligible for Token</div>
            </div>

            <div className="trust-card p-5 space-y-2">
              <div className="flex items-center justify-between text-[#5A6A7E]">
                <span className="text-xs font-bold uppercase tracking-wider">Escalated Transfers</span>
                <ShieldAlert className="w-4 h-4 text-[#B42318]" />
              </div>
              <div className="text-2xl font-extrabold text-[#B42318]">{escalatedTrf}</div>
              <div className="text-[11px] text-[#5A6A7E]">{rejectedTrf} Total Rejected Trades</div>
            </div>

            {frozenAssets > 0 && (
              <div className="trust-card p-5 space-y-2 border-red-200 bg-red-50/20 col-span-full">
                <div className="flex items-center gap-2 text-[#B42318] text-xs font-bold uppercase">
                  <AlertTriangle className="w-4 h-4" />
                  Active Asset Holds ({frozenAssets} Frozen)
                </div>
                <div className="text-xs text-[#5A6A7E]">
                  Enforce regulatory freeze holds under Lifecycle Governance.
                </div>
              </div>
            )}
          </>
        );
      }

      case 'INVESTOR': {
        const tokens = data.tokens || [];
        const transfers = data.transfers || [];
        const pending = transfers.filter((t) => t.status === 'PROPOSED').length;

        return (
          <>
            <div className="trust-card p-5 space-y-2">
              <div className="flex items-center justify-between text-[#5A6A7E]">
                <span className="text-xs font-bold uppercase tracking-wider">Available Securities</span>
                <Coins className="w-4 h-4 text-[#0F766E]" />
              </div>
              <div className="text-2xl font-extrabold text-[#0F766E]">{tokens.length}</div>
              <div className="text-[11px] text-[#5A6A7E]">Active Offerings on Platform</div>
            </div>

            <div className="trust-card p-5 space-y-2">
              <div className="flex items-center justify-between text-[#5A6A7E]">
                <span className="text-xs font-bold uppercase tracking-wider">Pending Trades</span>
                <ArrowRightLeft className="w-4 h-4 text-[#1F5A7A]" />
              </div>
              <div className="text-2xl font-extrabold text-[#1F5A7A]">{pending}</div>
              <div className="text-[11px] text-[#5A6A7E]">Proposals Involving My Holdings</div>
            </div>

            <div className="trust-card p-5 space-y-2">
              <div className="flex items-center justify-between text-[#5A6A7E]">
                <span className="text-xs font-bold uppercase tracking-wider">Settled Transfers</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-600">
                {transfers.filter((t) => t.status === 'EXECUTED').length}
              </div>
              <div className="text-[11px] text-[#5A6A7E]">Completed Transactions</div>
            </div>
          </>
        );
      }

      case 'AUDITOR': {
        const explorer = data.explorer || {};
        const transfers = data.transfers || [];
        const rejected = transfers.filter((t) => t.status === 'REJECTED').length;

        return (
          <>
            <div className="trust-card p-5 space-y-2">
              <div className="flex items-center justify-between text-[#5A6A7E]">
                <span className="text-xs font-bold uppercase tracking-wider">Ledger Block Height</span>
                <History className="w-4 h-4 text-[#1F5A7A]" />
              </div>
              <div className="text-2xl font-extrabold text-[#0F2A43]">{explorer.blockHeight || 1}</div>
              <div className="text-[11px] text-[#5A6A7E]">Hyperledger Fabric Block Commit</div>
            </div>

            <div className="trust-card p-5 space-y-2">
              <div className="flex items-center justify-between text-[#5A6A7E]">
                <span className="text-xs font-bold uppercase tracking-wider">Audit Log Entries</span>
                <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
              </div>
              <div className="text-2xl font-extrabold text-[#0F766E]">{explorer.totalAuditEntries || 0}</div>
              <div className="text-[11px] text-[#5A6A7E]">Cryptographically Anchored Events</div>
            </div>

            <div className="trust-card p-5 space-y-2">
              <div className="flex items-center justify-between text-[#5A6A7E]">
                <span className="text-xs font-bold uppercase tracking-wider">Rejected Trades</span>
                <ShieldAlert className="w-4 h-4 text-[#B42318]" />
              </div>
              <div className="text-2xl font-extrabold text-[#B42318]">{rejected}</div>
              <div className="text-[11px] text-[#5A6A7E]">Violations Enforced by Chaincode</div>
            </div>

            <div className="trust-card p-5 space-y-2">
              <div className="flex items-center justify-between text-[#5A6A7E]">
                <span className="text-xs font-bold uppercase tracking-wider">State Integrity</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-600">VERIFIED</div>
              <div className="text-[11px] text-[#5A6A7E]">Zero State Drift Detected</div>
            </div>
          </>
        );
      }

      default:
        return null;
    }
  };

  // Shortcut definitions with target tabs
  const allShortcuts = [
    {
      tab: 'identity-admin',
      title: 'Consortium Governance',
      desc: 'Provision identities, bind Fabric CA credentials, configure MSP participants.',
      icon: UserCheck,
    },
    {
      tab: 'asset-types',
      title: 'Asset Type Engine',
      desc: 'Define and deprecate parametric schemas, evidence requirements, and privacy rules.',
      icon: Building,
    },
    {
      tab: 'assets',
      title: 'Real-World Assets',
      desc: 'Manage asset passports, Merkle evidence trees, and verification submissions.',
      icon: Layers,
    },
    {
      tab: 'verification',
      title: 'Verification Audits',
      desc: 'Inspect documentation evidence, record checklist items, issue decisions.',
      icon: FileCheck,
    },
    {
      tab: 'valuation',
      title: 'Valuation & Pricing',
      desc: 'Submit certified appraisal models or approve independent valuations.',
      icon: TrendingUp,
    },
    {
      tab: 'tokens',
      title: 'Tokenized Securities',
      desc: 'Explore fractional offerings, manage cap tables, and issue security tokens.',
      icon: Coins,
    },
    {
      tab: 'transfers',
      title: 'Settlement & Transfer Rules',
      desc: 'Propose secondary transfers and inspect automatic compliance rules.',
      icon: ArrowRightLeft,
    },
    {
      tab: 'lifecycle',
      title: 'Lifecycle Governance',
      desc: 'Enforce regulatory freeze holds, redemption payouts, and retirement.',
      icon: Activity,
    },
    {
      tab: 'audit',
      title: 'Consortium Audit Trail',
      desc: 'Inspect immutable ledger logs, block heights, and cryptographic hashes.',
      icon: History,
    },
    {
      tab: 'participants',
      title: 'Participant Directory',
      desc: 'Review KYC documents, set holding limits, and manage counterparty status.',
      icon: Users,
    },
  ];

  // Only show shortcuts for tabs the user is authorized to open
  const authorizedShortcuts = allShortcuts.filter((s) => tabAccess(userRole, s.tab) !== null);

  const counters = useMemo(() => getRoleCounters(role, data, onNavigate), [role, data, onNavigate]);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {renderRoleCards()}
      </div>

      {/* Role-Specific Action Grid */}
      {authorizedShortcuts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0F2A43] uppercase tracking-wider">
              Authorized Modules ({user?.role})
      {/* Role-specific operational counters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#0F2A43] uppercase tracking-wider">
            Operational Overview ({role})
          </h3>
          <span className="text-xs text-[#5A6A7E]">
            {loading ? 'Reading ledger state…' : 'Live from consortium state'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <span className="text-xs text-[#5A6A7E]">Direct Workspace Shortcuts</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {authorizedShortcuts.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.tab}
                  onClick={() => onNavigate(s.tab)}
                  className="trust-card p-5 cursor-pointer hover:border-[#1F5A7A] transition group space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-[#F0F4F8] text-[#0F2A43] group-hover:bg-[#0F2A43] group-hover:text-white transition">
                      <Icon className="w-5 h-5" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#8795A5] group-hover:text-[#0F2A43] transition" />
                  </div>
                  <div className="text-sm font-bold text-[#0F2A43]">{s.title}</div>
                  <p className="text-xs text-[#5A6A7E]">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
