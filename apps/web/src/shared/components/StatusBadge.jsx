import React from 'react';

const TONES = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-red-50 text-red-800 border-red-200',
  caution: 'bg-orange-50 text-orange-800 border-orange-200',
  info: 'bg-sky-50 text-sky-800 border-sky-200',
  teal: 'bg-teal-50 text-teal-800 border-teal-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
};

const STATUS_TONE = {
  APPROVED: 'success',
  VERIFIED: 'success',
  ACTIVE: 'success',
  EXECUTED: 'success',

  UNDER_VERIFICATION: 'warning',
  UNDER_REVIEW: 'warning',
  SUBMITTED: 'warning',
  CHANGES_REQUESTED: 'warning',
  PENDING_COMPLIANCE: 'warning',
  PROPOSED: 'info',

  REJECTED: 'danger',
  FROZEN: 'danger',
  BLACKLISTED: 'danger',
  SUSPENDED: 'caution',

  REGISTERED: 'teal',
  VALUED: 'teal',
  TOKENIZED: 'info',

  INACTIVE: 'neutral',
  RETIRED: 'neutral',
  REDEEMED: 'neutral',
  DEPRECATED: 'neutral',
  QUALIFIED: 'neutral',
  INSTITUTIONAL: 'neutral',
  RETAIL: 'neutral',
};

const humanize = (status) => {
  if (!status) return '';
  const text = String(status).replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export function StatusBadge({ status }) {
  const tone = TONES[STATUS_TONE[status]] || TONES.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${tone}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {humanize(status)}
    </span>
  );
}
