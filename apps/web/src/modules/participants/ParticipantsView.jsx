import React, { useEffect, useState } from 'react';
import { api } from '../../shared/services/api.js';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { StatusBadge } from '../../shared/components/StatusBadge.jsx';
import { HashChip } from '../../shared/components/HashChip.jsx';
import { OnboardParticipantModal } from './OnboardParticipantModal.jsx';
import { ReviewKycModal } from './ReviewKycModal.jsx';
import { ParticipantDetailDrawer } from './ParticipantDetailDrawer.jsx';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Ban,
  AlertTriangle,
  MoreVertical,
  ExternalLink,
  Sliders,
  ShieldAlert,
} from 'lucide-react';

export function ParticipantsView() {
  const { user } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [kycFilter, setKycFilter] = useState('ALL');

  // Modals state
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [reviewKycTarget, setReviewKycTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);

  // Quick Action dialogs
  const [limitsDialogTarget, setLimitsDialogTarget] = useState(null);
  const [newLimits, setNewLimits] = useState({ maxHoldingBps: 2500, maxTransferRupees: 1000000 });
  const [suspendDialogTarget, setSuspendDialogTarget] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [blacklistDialogTarget, setBlacklistDialogTarget] = useState(null);
  const [blacklistReason, setBlacklistReason] = useState('');

  const isCompliance = user?.role === 'COMPLIANCE';
  const isAdmin = user?.role === 'ADMINISTRATOR';
  const isAuditor = user?.role === 'AUDITOR';

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const res = await api.getParticipants();
      if (res?.data) {
        setParticipants(res.data);
      }
    } catch (err) {
      console.error('Failed to load participants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, [user]);

  // Metric counts
  const totalCount = participants.length;
  const approvedCount = participants.filter((p) => p.kycStatus === 'APPROVED').length;
  const pendingCount = participants.filter(
    (p) => p.kycStatus === 'SUBMITTED' || p.kycStatus === 'UNDER_REVIEW'
  ).length;
  const flaggedCount = participants.filter(
    (p) => p.status === 'SUSPENDED' || p.status === 'BLACKLISTED'
  ).length;

  // Filtered list
  const filtered = participants.filter((p) => {
    const matchesSearch =
      (p.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.pii?.legalName || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.orgId || '').toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchesKyc = kycFilter === 'ALL' || p.kycStatus === kycFilter;

    return matchesSearch && matchesStatus && matchesKyc;
  });

  const handleSetLimits = async (e) => {
    e.preventDefault();
    if (!limitsDialogTarget) return;
    try {
      await api.setLimits(
        limitsDialogTarget.id,
        Number(newLimits.maxHoldingBps),
        Math.round(Number(newLimits.maxTransferRupees) * 100),
        'Limits updated via governance portal'
      );
      setLimitsDialogTarget(null);
      fetchParticipants();
    } catch (err) {
      alert(err.message || 'Failed to update limits');
    }
  };

  const handleToggleSuspend = async (participant) => {
    try {
      if (participant.status === 'SUSPENDED') {
        await api.reinstateParticipant(participant.id, 'Reinstated by administrator');
      } else {
        await api.suspendParticipant(participant.id, suspendReason || 'Temporary administrative freeze');
      }
      setSuspendDialogTarget(null);
      setSuspendReason('');
      fetchParticipants();
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  const handleToggleBlacklist = async (participant) => {
    try {
      if (participant.status === 'BLACKLISTED') {
        await api.removeFromBlacklist(participant.id, 'Compliance clearance granted');
      } else {
        await api.addToBlacklist(participant.id, blacklistReason || 'Compliance sanctions list match');
      }
      setBlacklistDialogTarget(null);
      setBlacklistReason('');
      fetchParticipants();
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Phase 1: Participants, Identity & Access</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Consortium Participant Directory</h2>
          <p className="text-xs text-slate-400">
            Cryptographically anchored participant identities, KYC eligibility profiles, and transfer cap limits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOnboardModal(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Onboard Participant</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Participants</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalCount}</div>
          <div className="text-[11px] text-slate-500">Across 6 Consortium Orgs</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>KYC Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{approvedCount}</div>
          <div className="text-[11px] text-slate-500">Eligible for Token Transfers</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{pendingCount}</div>
          <div className="text-[11px] text-slate-500">Awaiting Compliance Action</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Suspended / Flagged</span>
            <Ban className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{flaggedCount}</div>
          <div className="text-[11px] text-slate-500">Rule Restrictions Active</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center gap-3 justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, name, or org..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>KYC:</span>
            <select
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="ALL">All KYC</option>
              <option value="APPROVED">Approved</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BLACKLISTED">Blacklisted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Participants Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Participant</th>
                <th className="py-3.5 px-4">Consortium Org</th>
                <th className="py-3.5 px-4">Tier</th>
                <th className="py-3.5 px-4">KYC Status</th>
                <th className="py-3.5 px-4">Ledger State</th>
                <th className="py-3.5 px-4">Transfer Rules / Limits</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <span>Reading participant ledger world state...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No consortium participants found matching the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                          <span>{p.pii?.legalName || 'Registered Actor'}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                            {p.kind}
                          </span>
                        </div>
                        <div className="font-mono text-[10px] text-indigo-400">{p.id}</div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      <div>{p.mspId || p.orgId}</div>
                      <div className="text-[10px] text-slate-500">{p.jurisdiction}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={p.investorClass || 'RETAIL'} />
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={p.kycStatus} />
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={p.status} />
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="text-[11px]">
                        Cap: <span className="font-semibold text-white">{((p.limits?.maxHoldingBps || 2500) / 100).toFixed(1)}%</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Max: ₹{(((p.limits?.maxTransferPaise || 100000000) / 100)).toLocaleString('en-IN')}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => setDetailTarget(p)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition"
                      >
                        Passport
                      </button>

                      {/* Compliance-specific actions */}
                      {isCompliance && (
                        <>
                          <button
                            onClick={() => setReviewKycTarget(p)}
                            className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[11px] font-medium transition"
                          >
                            Review KYC
                          </button>
                          <button
                            onClick={() => setBlacklistDialogTarget(p)}
                            className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[11px] font-medium transition"
                          >
                            {p.status === 'BLACKLISTED' ? 'Unblacklist' : 'Blacklist'}
                          </button>
                        </>
                      )}

                      {/* Administrator actions */}
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => {
                              setLimitsDialogTarget(p);
                              setNewLimits({
                                maxHoldingBps: p.limits?.maxHoldingBps || 2500,
                                maxTransferRupees: (p.limits?.maxTransferPaise || 100000000) / 100,
                              });
                            }}
                            className="px-2.5 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-[11px] font-medium transition"
                          >
                            Limits
                          </button>
                          <button
                            onClick={() => setSuspendDialogTarget(p)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition"
                          >
                            {p.status === 'SUSPENDED' ? 'Reinstate' : 'Suspend'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboard Modal */}
      <OnboardParticipantModal
        isOpen={showOnboardModal}
        onClose={() => setShowOnboardModal(false)}
        onCreated={fetchParticipants}
        user={user}
      />

      {/* Review KYC Modal */}
      <ReviewKycModal
        isOpen={!!reviewKycTarget}
        participant={reviewKycTarget}
        onClose={() => setReviewKycTarget(null)}
        onUpdated={fetchParticipants}
      />

      {/* Participant Detail Drawer */}
      <ParticipantDetailDrawer
        participant={detailTarget}
        onClose={() => setDetailTarget(null)}
        onOpenReviewKyc={(p) => setReviewKycTarget(p)}
        user={user}
      />

      {/* Set Limits Modal */}
      {limitsDialogTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Adjust Holding Cap & Transfer Limits
            </h3>
            <p className="text-xs text-slate-400">
              Participant: <span className="font-mono text-indigo-400">{limitsDialogTarget.id}</span>
            </p>
            <form onSubmit={handleSetLimits} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Max Holding Cap (Basis Points, 100 bps = 1%)
                </label>
                <input
                  type="number"
                  min="100"
                  max="10000"
                  value={newLimits.maxHoldingBps}
                  onChange={(e) => setNewLimits({ ...newLimits, maxHoldingBps: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Per-Transfer Cap (₹ Rupees)
                </label>
                <input
                  type="number"
                  min="1000"
                  value={newLimits.maxTransferRupees}
                  onChange={(e) => setNewLimits({ ...newLimits, maxTransferRupees: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLimitsDialogTarget(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"
                >
                  Save Limits
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Dialog */}
      {suspendDialogTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              {suspendDialogTarget.status === 'SUSPENDED' ? 'Reinstate Participant' : 'Suspend Participant'}
            </h3>
            <p className="text-xs text-slate-300">
              {suspendDialogTarget.status === 'SUSPENDED'
                ? `Reinstate participant ${suspendDialogTarget.id} to active trading eligibility.`
                : `Suspending participant ${suspendDialogTarget.id} immediately blocks outgoing and incoming token transfers.`}
            </p>
            {suspendDialogTarget.status !== 'SUSPENDED' && (
              <textarea
                required
                rows={2}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Mandatory reason for suspension..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSuspendDialogTarget(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleSuspend(suspendDialogTarget)}
                className="px-4 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blacklist Confirmation Dialog */}
      {blacklistDialogTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              {blacklistDialogTarget.status === 'BLACKLISTED'
                ? 'Remove from Blacklist'
                : 'Add to Compliance Blacklist'}
            </h3>
            <p className="text-xs text-slate-300">
              {blacklistDialogTarget.status === 'BLACKLISTED'
                ? `Clear participant ${blacklistDialogTarget.id} from compliance sanctions blacklist.`
                : `Blacklisting participant ${blacklistDialogTarget.id} permanently prohibits all ledger operations until cleared.`}
            </p>
            {blacklistDialogTarget.status !== 'BLACKLISTED' && (
              <textarea
                required
                rows={2}
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
                placeholder="Compliance reason / sanction reference..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBlacklistDialogTarget(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleBlacklist(blacklistDialogTarget)}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
