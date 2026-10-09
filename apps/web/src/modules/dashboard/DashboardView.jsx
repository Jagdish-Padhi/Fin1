import React, { useEffect, useState } from 'react';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { api } from '../../shared/services/api.js';
import { tabAccess } from '../../shared/utils/permissions.js';
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
  AlertTriangle,
  Users,
  ShieldAlert,
} from 'lucide-react';

export function DashboardView({ onNavigate }) {
  const { user } = useAuth();
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
