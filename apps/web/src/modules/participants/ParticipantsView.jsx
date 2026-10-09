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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D8E0E8]">
        <div>
          <h2 className="text-2xl font-bold text-[#0F2A43] tracking-tight font-['Outfit',sans-serif]">
            Participant Directory
          </h2>
          <p className="text-xs text-[#5A6A7E] mt-0.5">
            Cryptographically anchored participant identities, KYC eligibility profiles, and transfer limits
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchParticipants}
            disabled={loading}
            className="p-2 rounded-xl bg-white border border-[#D8E0E8] text-[#5A6A7E] hover:text-[#0F2A43] hover:bg-[#F8FAFC] transition shadow-2xs"
            title="Refresh participant registry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0F766E]' : ''}`} />
          </button>

          <button
            onClick={() => setShowOnboardModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0F2A43] hover:bg-[#0A1E30] text-white shadow-xs flex items-center gap-2 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Onboard Participant</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="trust-card p-4 space-y-1.5">
          <div className="flex items-center justify-between text-[#5A6A7E] text-xs font-bold uppercase tracking-wider">
            <span>Total Participants</span>
            <Users className="w-4 h-4 text-[#1F5A7A]" />
          </div>
          <div className="text-2xl font-extrabold text-[#0F2A43]">{totalCount}</div>
          <div className="text-[11px] text-[#5A6A7E]">Across Consortium Organizations</div>
        </div>

        <div className="trust-card p-4 space-y-1.5">
          <div className="flex items-center justify-between text-[#5A6A7E] text-xs font-bold uppercase tracking-wider">
            <span>KYC Approved</span>
            <CheckCircle2 className="w-4 h-4 text-[#18794E]" />
          </div>
          <div className="text-2xl font-extrabold text-[#18794E]">{approvedCount}</div>
          <div className="text-[11px] text-[#5A6A7E]">Eligible for Token Transfers</div>
        </div>

        <div className="trust-card p-4 space-y-1.5">
          <div className="flex items-center justify-between text-[#5A6A7E] text-xs font-bold uppercase tracking-wider">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-[#A16207]" />
          </div>
          <div className="text-2xl font-extrabold text-[#A16207]">{pendingCount}</div>
          <div className="text-[11px] text-[#5A6A7E]">Awaiting Compliance Action</div>
        </div>

        <div className="trust-card p-4 space-y-1.5">
          <div className="flex items-center justify-between text-[#5A6A7E] text-xs font-bold uppercase tracking-wider">
            <span>Suspended / Flagged</span>
            <Ban className="w-4 h-4 text-[#B42318]" />
          </div>
          <div className="text-2xl font-extrabold text-[#B42318]">{flaggedCount}</div>
          <div className="text-[11px] text-[#5A6A7E]">Transfer Restrictions Active</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="trust-card p-3.5 flex flex-col md:flex-row items-center gap-3 justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#8795A5] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, name, or org..."
            className="w-full bg-[#F8FAFC] border border-[#D8E0E8] rounded-lg pl-9 pr-3 py-2 text-xs text-[#17202A] placeholder-[#8795A5] focus:outline-none focus:border-[#1F5A7A] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-[#5A6A7E] font-medium">
            <Filter className="w-3.5 h-3.5 text-[#8795A5]" />
            <span>KYC:</span>
            <select
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              className="bg-[#F8FAFC] border border-[#D8E0E8] rounded-lg px-2.5 py-1.5 text-xs text-[#17202A] focus:outline-none focus:border-[#1F5A7A]"
            >
              <option value="ALL">All KYC</option>
              <option value="APPROVED">Approved</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#5A6A7E] font-medium">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#F8FAFC] border border-[#D8E0E8] rounded-lg px-2.5 py-1.5 text-xs text-[#17202A] focus:outline-none focus:border-[#1F5A7A]"
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
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#D8E0E8] text-[10px] text-[#5A6A7E] uppercase tracking-wider font-bold">
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
            <tbody className="divide-y divide-[#E8EEF3]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-[#5A6A7E]">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 border-[#0F766E] animate-spin text-[#0F766E]" />
                      <span>Reading participant ledger world state...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-[#5A6A7E]">
                    No consortium participants found matching the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F8FAFC] transition">
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-bold text-[#0F2A43] flex items-center gap-1.5">
                          <span>{p.pii?.legalName || 'Registered Actor'}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F0F4F8] text-[#1F5A7A] font-mono font-medium">
                            {p.kind}
                          </span>
                        </div>
                        <div className="font-mono text-[11px] text-[#0F766E] font-medium">{p.id}</div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[#17202A]">
                      <div className="font-semibold">{p.mspId || p.orgId}</div>
                      <div className="text-[10px] text-[#5A6A7E]">{p.jurisdiction}</div>
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

                    <td className="py-3.5 px-4 text-[#17202A]">
                      <div className="text-[11px]">
                        Cap: <span className="font-bold text-[#0F2A43]">{((p.limits?.maxHoldingBps || 2500) / 100).toFixed(1)}%</span>
                      </div>
                      <div className="text-[10px] text-[#5A6A7E]">
                        Max: ₹{(((p.limits?.maxTransferPaise || 100000000) / 100)).toLocaleString('en-IN')}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => setDetailTarget(p)}
                        className="px-2.5 py-1 rounded-md bg-[#F0F4F8] hover:bg-[#E2E8F0] text-[#0F2A43] text-[11px] font-semibold transition"
                      >
                        Passport
                      </button>

                      {/* Compliance-specific governance actions */}
                      {isCompliance && (
                        <>
                          <button
                            onClick={() => setReviewKycTarget(p)}
                            className="px-2.5 py-1 rounded-md bg-[#FEFCE8] hover:bg-[#FEF08A] text-[#A16207] border border-[#FEF08A] text-[11px] font-semibold transition"
                          >
                            Review KYC
                          </button>
                          <button
                            onClick={() => {
                              setLimitsDialogTarget(p);
                              setNewLimits({
                                maxHoldingBps: p.limits?.maxHoldingBps || 2500,
                                maxTransferRupees: (p.limits?.maxTransferPaise || 100000000) / 100,
                              });
                            }}
                            className="px-2.5 py-1 rounded-md bg-[#F0FDFA] hover:bg-[#CCFBF1] text-[#0F766E] border border-[#CCFBF1] text-[11px] font-semibold transition"
                          >
                            Limits
                          </button>
                          <button
                            onClick={() => setSuspendDialogTarget(p)}
                            className="px-2.5 py-1 rounded-md bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#5A6A7E] text-[11px] font-semibold transition"
                          >
                            {p.status === 'SUSPENDED' ? 'Reinstate' : 'Suspend'}
                          </button>
                          <button
                            onClick={() => setBlacklistDialogTarget(p)}
                            className="px-2.5 py-1 rounded-md bg-[#FEF2F2] hover:bg-[#FECDD3] text-[#B42318] border border-[#FECDD3] text-[11px] font-semibold transition"
                          >
                            {p.status === 'BLACKLISTED' ? 'Unblacklist' : 'Blacklist'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F2A43]/40 backdrop-blur-xs">
          <div className="bg-white border border-[#D8E0E8] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-popover">
            <h3 className="text-base font-bold text-[#0F2A43] flex items-center gap-2 font-['Outfit',sans-serif]">
              <Sliders className="w-4 h-4 text-[#1F5A7A]" />
              Adjust Holding Cap & Transfer Limits
            </h3>
            <p className="text-xs text-[#5A6A7E]">
              Participant: <span className="font-mono text-[#0F766E] font-semibold">{limitsDialogTarget.id}</span>
            </p>
            <form onSubmit={handleSetLimits} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#17202A] mb-1">
                  Max Holding Cap (Basis Points, 100 bps = 1%)
                </label>
                <input
                  type="number"
                  min="100"
                  max="10000"
                  value={newLimits.maxHoldingBps}
                  onChange={(e) => setNewLimits({ ...newLimits, maxHoldingBps: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#D8E0E8] rounded-lg p-2.5 text-xs text-[#17202A] focus:outline-none focus:border-[#1F5A7A] focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#17202A] mb-1">
                  Per-Transfer Cap (₹ Rupees)
                </label>
                <input
                  type="number"
                  min="1000"
                  value={newLimits.maxTransferRupees}
                  onChange={(e) => setNewLimits({ ...newLimits, maxTransferRupees: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#D8E0E8] rounded-lg p-2.5 text-xs text-[#17202A] focus:outline-none focus:border-[#1F5A7A] focus:bg-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#D8E0E8]">
                <button
                  type="button"
                  onClick={() => setLimitsDialogTarget(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-[#5A6A7E] hover:text-[#17202A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-[#0F2A43] hover:bg-[#0A1E30] text-white rounded-lg transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F2A43]/40 backdrop-blur-xs">
          <div className="bg-white border border-[#D8E0E8] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-popover">
            <h3 className="text-base font-bold text-[#0F2A43]">
              {suspendDialogTarget.status === 'SUSPENDED' ? 'Reinstate Participant' : 'Suspend Participant'}
            </h3>
            <p className="text-xs text-[#5A6A7E]">
              {suspendDialogTarget.status === 'SUSPENDED'
                ? 'Reinstating will re-enable token transfers and participation.'
                : 'Suspending will freeze all token transfers on the ledger rule engine.'}
            </p>
            {suspendDialogTarget.status !== 'SUSPENDED' && (
              <div>
                <label className="block text-xs font-semibold text-[#17202A] mb-1">
                  Reason for Suspension *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Identity verification discrepancy"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#D8E0E8] rounded-lg p-2.5 text-xs text-[#17202A] focus:outline-none focus:border-[#1F5A7A] focus:bg-white"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-[#D8E0E8]">
              <button
                type="button"
                onClick={() => setSuspendDialogTarget(null)}
                className="px-3 py-1.5 text-xs font-semibold text-[#5A6A7E] hover:text-[#17202A]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleSuspend(suspendDialogTarget)}
                className="px-4 py-1.5 text-xs font-semibold bg-[#0F2A43] hover:bg-[#0A1E30] text-white rounded-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blacklist Confirmation Dialog */}
      {blacklistDialogTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F2A43]/40 backdrop-blur-xs">
          <div className="bg-white border border-[#D8E0E8] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-popover">
            <h3 className="text-base font-bold text-[#B42318]">
              {blacklistDialogTarget.status === 'BLACKLISTED'
                ? 'Remove from Sanctions Blacklist'
                : 'Add to Compliance Blacklist'}
            </h3>
            <p className="text-xs text-[#5A6A7E]">
              Blacklisted participants are banned across all consortium settlement transactions.
            </p>
            {blacklistDialogTarget.status !== 'BLACKLISTED' && (
              <div>
                <label className="block text-xs font-semibold text-[#17202A] mb-1">
                  Sanction / Blacklist Justification *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Regulatory compliance notification #771"
                  value={blacklistReason}
                  onChange={(e) => setBlacklistReason(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#D8E0E8] rounded-lg p-2.5 text-xs text-[#17202A] focus:outline-none focus:border-[#1F5A7A] focus:bg-white"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-[#D8E0E8]">
              <button
                type="button"
                onClick={() => setBlacklistDialogTarget(null)}
                className="px-3 py-1.5 text-xs font-semibold text-[#5A6A7E] hover:text-[#17202A]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleBlacklist(blacklistDialogTarget)}
                className="px-4 py-1.5 text-xs font-semibold bg-[#B42318] hover:bg-[#991B1B] text-white rounded-lg"
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
