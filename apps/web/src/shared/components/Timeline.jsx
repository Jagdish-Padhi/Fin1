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
    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
      {events.map((evt, idx) => (
        <div key={evt.id || idx} className="relative group">
          <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-indigo-500 bg-slate-950 group-hover:scale-125 transition" />
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-200">
                  {evt.actorRole} ({evt.actorOrg})
                </span>
                <span className="text-xs text-slate-500">→</span>
                <StatusBadge status={evt.toState || evt.action} />
              </div>
              <span className="text-[11px] text-slate-500">
                {new Date(evt.occurredAt).toLocaleString()}
              </span>
            </div>

            {evt.reasonText && (
              <p className="text-xs text-slate-300 bg-slate-950/50 p-2 rounded border border-slate-800/50">
                "{evt.reasonText}"
              </p>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/40 text-[11px]">
              <span className="text-slate-500">Block #{evt.blockNumber}</span>
              <HashChip hash={evt.txId} label="Tx" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
