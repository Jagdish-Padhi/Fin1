import React from 'react';

const STATUS_STYLES = {
  // Asset statuses
  REGISTERED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  UNDER_VERIFICATION: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  CHANGES_REQUESTED: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  VERIFIED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  VALUED: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  TOKENIZED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  FROZEN: 'bg-red-500/10 text-red-400 border-red-500/20',
  REDEEMED: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  RETIRED: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  REJECTED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',

  // Participant & KYC statuses
  APPROVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  SUBMITTED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  UNDER_REVIEW: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  SUSPENDED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  BLACKLISTED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  INACTIVE: 'bg-slate-700/40 text-slate-400 border-slate-700',
  QUALIFIED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  INSTITUTIONAL: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  RETAIL: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',

  // Transfer statuses
  PROPOSED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  EXECUTED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  PENDING_COMPLIANCE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'bg-slate-800 text-slate-300 border-slate-700';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-75" />
      {status}
    </span>
  );
}
