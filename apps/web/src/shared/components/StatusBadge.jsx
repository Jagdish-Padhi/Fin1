import React from 'react';

const STATUS_STYLES = {
  // Positive / Verified / Active statuses
  APPROVED: 'bg-[#F0FDF4] text-[#18794E] border-[#BBF7D0]',
  VERIFIED: 'bg-[#F0FDF4] text-[#18794E] border-[#BBF7D0]',
  ACTIVE: 'bg-[#F0FDF4] text-[#18794E] border-[#BBF7D0]',
  EXECUTED: 'bg-[#F0FDF4] text-[#18794E] border-[#BBF7D0]',

  // Warning / In-progress / Verification queue
  UNDER_VERIFICATION: 'bg-[#FEFCE8] text-[#A16207] border-[#FEF08A]',
  UNDER_REVIEW: 'bg-[#FEFCE8] text-[#A16207] border-[#FEF08A]',
  SUBMITTED: 'bg-[#FEFCE8] text-[#A16207] border-[#FEF08A]',
  CHANGES_REQUESTED: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
  PENDING_COMPLIANCE: 'bg-[#FEFCE8] text-[#A16207] border-[#FEF08A]',
  PROPOSED: 'bg-[#F0F4F8] text-[#1F5A7A] border-[#D8E0E8]',

  // Negative / Restricted / Flagged
  REJECTED: 'bg-[#FEF2F2] text-[#B42318] border-[#FECDD3]',
  FROZEN: 'bg-[#FEF2F2] text-[#B42318] border-[#FECDD3]',
  BLACKLISTED: 'bg-[#FEF2F2] text-[#B42318] border-[#FECDD3]',
  SUSPENDED: 'bg-[#FFF7ED] text-[#C2410C] border-[#FFEDD5]',

  // Registered / Minted / Tokens
  REGISTERED: 'bg-[#F0FDFA] text-[#0F766E] border-[#CCFBF1]',
  VALUED: 'bg-[#F0FDFA] text-[#0F766E] border-[#CCFBF1]',
  TOKENIZED: 'bg-[#F0F4F8] text-[#0F2A43] border-[#CBD5E1]',

  // Archival / Neutral
  INACTIVE: 'bg-[#F1F5F9] text-[#5A6A7E] border-[#D8E0E8]',
  RETIRED: 'bg-[#F1F5F9] text-[#5A6A7E] border-[#D8E0E8]',
  REDEEMED: 'bg-[#F1F5F9] text-[#5A6A7E] border-[#D8E0E8]',
  DEPRECATED: 'bg-[#F1F5F9] text-[#5A6A7E] border-[#D8E0E8]',

  // Classification tiers
  QUALIFIED: 'bg-[#F8FAFC] text-[#0F2A43] border-[#D8E0E8]',
  INSTITUTIONAL: 'bg-[#F8FAFC] text-[#0F2A43] border-[#D8E0E8]',
  RETAIL: 'bg-[#F8FAFC] text-[#1F5A7A] border-[#D8E0E8]',
};

export function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'bg-[#F8FAFC] text-[#5A6A7E] border-[#D8E0E8]';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${style}`}
    >
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
}
