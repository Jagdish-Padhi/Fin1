import React from 'react';
import { StatusBadge } from './StatusBadge.jsx';
import { HashChip } from './HashChip.jsx';

export function Timeline({ events = [] }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No state transitions or audit records found.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#D8E0E8]">
      {events.map((evt, idx) => (
        <div key={evt.id || idx} className="relative group">
          <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-[#0F766E] bg-white shadow-sm group-hover:scale-125 transition" />
          <div className="bg-white border border-[#D8E0E8] rounded-xl p-3.5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#17202A]">
                  {evt.actorRole} ({evt.actorOrg})
                </span>
                <span className="text-xs text-[#5A6A7E]">→</span>
                <StatusBadge status={evt.toState || evt.action} />
              </div>
              <span className="text-[11px] text-[#5A6A7E]">
                {new Date(evt.occurredAt).toLocaleString()}
              </span>
            </div>

            {evt.reasonText && (
              <p className="text-xs text-[#17202A] bg-[#F8FAFC] p-2.5 rounded-lg border border-[#D8E0E8]">
                "{evt.reasonText}"
              </p>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-[#D8E0E8] text-[11px]">
              <span className="text-[#5A6A7E] font-medium">Block #{evt.blockNumber}</span>
              <HashChip hash={evt.txId} label="Tx" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
