import React, { useEffect, useState } from 'react';
import { api } from '../../shared/services/api.js';
import { useAuth } from '../../shared/context/AuthContext.jsx';
import { useToast } from '../../shared/components/Toast.jsx';
import { StatusBadge } from '../../shared/components/StatusBadge.jsx';
import { OnboardParticipantModal } from './OnboardParticipantModal.jsx';
import { ReviewKycModal } from './ReviewKycModal.jsx';
import { ParticipantDetailDrawer } from './ParticipantDetailDrawer.jsx';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Ban,
  Sliders,
  ShieldCheck,
  Building,
  RefreshCw,
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
  const toast = useToast();

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
      toast.error(err.message || 'Failed to update transfer limits.');
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
      toast.error(err.message || 'Suspend/Reinstate action failed.');
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
      toast.error(err.message || 'Blacklist action failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="page-header">
        <div>
          <h2 className="page-title">
            Participant Directory
          </h2>
          <p className="page-subtitle">
            Cryptographically anchored participant identities, KYC eligibility profiles, and transfer limits
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchParticipants}
            disabled={loading}
            className="trust-btn-secondary !px-2.5"
            title="Refresh participant registry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-trust-accent' : ''}`} />
          </button>

          <button
            onClick={() => setShowOnboardModal(true)}
            className="trust-btn-primary"
          >
            <UserPlus className="w-4 h-4" />
            <span>Onboard Participant</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="trust-card p-4 space-y-1.5">
          <div className="flex items-center justify-between text-trust-text-muted text-xs font-semibold">
            <span>Total Participants</span>
            <Users className="w-4 h-4 text-trust-secondary" />
          </div>
          <div className="text-2xl font-semibold tabular-nums text-trust-primary">{totalCount}</div>
          <div className="text-xs text-trust-text-muted">Across Consortium Organizations</div>
        </div>

        <div className="trust-card p-4 space-y-1.5">
          <div className="flex items-center justify-between text-trust-text-muted text-xs font-semibold">
            <span>KYC Approved</span>
            <CheckCircle2 className="w-4 h-4 text-trust-success" />
          </div>
          <div className="text-2xl font-semibold tabular-nums text-trust-primary">{approvedCount}</div>
          <div className="text-xs text-trust-text-muted">Eligible for Token Transfers</div>
        </div>

        <div className="trust-card p-4 space-y-1.5">
          <div className="flex items-center justify-between text-trust-text-muted text-xs font-semibold">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-trust-warning" />
          </div>
          <div className="text-2xl font-semibold tabular-nums text-trust-primary">{pendingCount}</div>
          <div className="text-xs text-trust-text-muted">Awaiting Compliance Action</div>
        </div>

        <div className="trust-card p-4 space-y-1.5">
          <div className="flex items-center justify-between text-trust-text-muted text-xs font-semibold">
            <span>Suspended / Flagged</span>
            <Ban className="w-4 h-4 text-trust-error" />
          </div>
          <div className="text-2xl font-semibold tabular-nums text-trust-primary">{flaggedCount}</div>
          <div className="text-xs text-trust-text-muted">Transfer Restrictions Active</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="trust-card p-3.5 flex flex-col md:flex-row items-center gap-3 justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-trust-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, name, or org..."
            className="trust-input w-full pl-9 pr-3"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-trust-text-muted font-medium">
            <Filter className="w-3.5 h-3.5 text-trust-text-subtle" />
            <span>KYC:</span>
            <select
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              className="trust-input"
            >
              <option value="ALL">All KYC</option>
              <option value="APPROVED">Approved</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-trust-text-muted font-medium">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="trust-input"
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
      <div className="trust-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 border-b border-trust-border text-xs text-trust-text-muted font-medium">
              <tr>
                <th className="py-3 px-4">Participant</th>
                <th className="py-3 px-4">Consortium Org</th>
                <th className="py-3 px-4">Tier</th>
                <th className="py-3 px-4">KYC Status</th>
                <th className="py-3 px-4">Ledger State</th>
                <th className="py-3 px-4">Holding & Transfer Limits</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-trust-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-trust-text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 border-trust-accent animate-spin text-trust-accent" />
                      <span>Reading participant ledger world state...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-trust-text-muted">
                    No consortium participants found matching the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-semibold text-trust-primary flex items-center gap-1.5">
                          <span>{p.pii?.legalName || 'Registered Actor'}</span>
                          <span className="text-xs px-1.5 py-0.2 rounded bg-slate-100 text-trust-secondary font-mono font-medium">
                            {p.kind}
                          </span>
                        </div>
                        <div className="font-mono text-xs text-trust-accent font-medium">{p.id}</div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-trust-text">
                      <div className="font-semibold">{p.mspId || p.orgId}</div>
                      <div className="text-xs text-trust-text-muted">{p.jurisdiction}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={p.investorClass || 'RETAIL'} />
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusBadge status={p.kycStatus} />
                        {(p.zkProofHash || p.zkPassport) && (
                          <span
                            className="text-xs font-semibold px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] shrink-0"
                            title={`ZKPassport Attested: ${p.zkProofHash?.slice(0, 16)}...`}
                          >
                            ZK-KYC
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={p.status} />
                    </td>

                    <td className="py-3.5 px-4 text-trust-text">
                      <div className="text-xs">
                        Cap: <span className="font-semibold text-trust-primary">{p.limits?.maxHoldingBps ? `${(p.limits.maxHoldingBps / 100).toFixed(1)}%` : 'Not set'}</span>
                      </div>
                      <div className="text-xs text-trust-text-muted">
                        Max: {p.limits?.maxTransferPaise ? `₹${(p.limits.maxTransferPaise / 100).toLocaleString('en-IN')}` : 'Not set'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => setDetailTarget(p)}
                        className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-trust-border-subtle text-trust-primary text-xs font-semibold transition"
                      >
                        Passport
                      </button>

                      {/* Compliance-specific actions */}
                      {isCompliance && (
                        <>
                          <button
                            onClick={() => setReviewKycTarget(p)}
                            className="px-2.5 py-1 rounded-md bg-trust-warning-bg hover:bg-trust-warning-border text-trust-warning border border-trust-warning-border text-xs font-semibold transition"
                          >
                            Review KYC
                          </button>
                          <button
                            onClick={() => setBlacklistDialogTarget(p)}
                            className="px-2.5 py-1 rounded-md bg-trust-error-bg hover:bg-trust-error-border text-trust-error border border-trust-error-border text-xs font-semibold transition"
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
                            className="px-2.5 py-1 rounded-md bg-trust-accent-light hover:bg-[#CCFBF1] text-trust-accent border border-[#CCFBF1] text-xs font-semibold transition"
                          >
                            Limits
                          </button>
                          <button
                            onClick={() => setSuspendDialogTarget(p)}
                            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-trust-border-subtle text-trust-text-muted text-xs font-semibold transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white border border-trust-border rounded-lg w-full max-w-md p-6 space-y-4 shadow-popover">
            <h3 className="text-base font-semibold text-trust-primary flex items-center gap-2">
              <Sliders className="w-4 h-4 text-trust-secondary" />
              Adjust Holding Cap & Transfer Limits
            </h3>
            <p className="text-xs text-trust-text-muted">
              Participant: <span className="font-mono text-trust-accent font-semibold">{limitsDialogTarget.id}</span>
            </p>
            <form onSubmit={handleSetLimits} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-trust-text mb-1">
                  Max Holding Cap (Basis Points, 100 bps = 1%)
                </label>
                <input
                  type="number"
                  min="100"
                  max="10000"
                  value={newLimits.maxHoldingBps}
                  onChange={(e) => setNewLimits({ ...newLimits, maxHoldingBps: e.target.value })}
                  className="w-full bg-slate-50 border border-trust-border rounded-lg p-2.5 text-xs text-trust-text focus:outline-none focus:border-trust-secondary focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-trust-text mb-1">
                  Per-Transfer Cap (₹ Rupees)
                </label>
                <input
                  type="number"
                  min="1000"
                  value={newLimits.maxTransferRupees}
                  onChange={(e) => setNewLimits({ ...newLimits, maxTransferRupees: e.target.value })}
                  className="w-full bg-slate-50 border border-trust-border rounded-lg p-2.5 text-xs text-trust-text focus:outline-none focus:border-trust-secondary focus:bg-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-trust-border">
                <button
                  type="button"
                  onClick={() => setLimitsDialogTarget(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-trust-text-muted hover:text-trust-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="trust-btn-primary"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white border border-trust-border rounded-lg w-full max-w-md p-6 space-y-4 shadow-popover">
            <h3 className="text-base font-semibold text-trust-primary">
              {suspendDialogTarget.status === 'SUSPENDED' ? 'Reinstate Participant' : 'Suspend Participant'}
            </h3>
            <p className="text-xs text-trust-text-muted">
              {suspendDialogTarget.status === 'SUSPENDED'
                ? 'Reinstating will re-enable token transfers and participation.'
                : 'Suspending will freeze all token transfers on the ledger rule engine.'}
            </p>
            {suspendDialogTarget.status !== 'SUSPENDED' && (
              <div>
                <label className="block text-xs font-semibold text-trust-text mb-1">
                  Reason for Suspension *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Identity verification discrepancy"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="w-full bg-slate-50 border border-trust-border rounded-lg p-2.5 text-xs text-trust-text focus:outline-none focus:border-trust-secondary focus:bg-white"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-trust-border">
              <button
                type="button"
                onClick={() => setSuspendDialogTarget(null)}
                className="px-3 py-1.5 text-xs font-semibold text-trust-text-muted hover:text-trust-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleSuspend(suspendDialogTarget)}
                className="trust-btn-primary"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blacklist Confirmation Dialog */}
      {blacklistDialogTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white border border-trust-border rounded-lg w-full max-w-md p-6 space-y-4 shadow-popover">
            <h3 className="text-base font-semibold text-trust-error">
              {blacklistDialogTarget.status === 'BLACKLISTED'
                ? 'Remove from Sanctions Blacklist'
                : 'Add to Compliance Blacklist'}
            </h3>
            <p className="text-xs text-trust-text-muted">
              Blacklisted participants are banned across all consortium settlement transactions.
            </p>
            {blacklistDialogTarget.status !== 'BLACKLISTED' && (
              <div>
                <label className="block text-xs font-semibold text-trust-text mb-1">
                  Sanction / Blacklist Justification *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Regulatory compliance notification #771"
                  value={blacklistReason}
                  onChange={(e) => setBlacklistReason(e.target.value)}
                  className="w-full bg-slate-50 border border-trust-border rounded-lg p-2.5 text-xs text-trust-text focus:outline-none focus:border-trust-secondary focus:bg-white"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-trust-border">
              <button
                type="button"
                onClick={() => setBlacklistDialogTarget(null)}
                className="px-3 py-1.5 text-xs font-semibold text-trust-text-muted hover:text-trust-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleBlacklist(blacklistDialogTarget)}
                className="trust-btn-danger"
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
