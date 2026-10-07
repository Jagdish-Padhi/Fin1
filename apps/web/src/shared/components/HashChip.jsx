import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function HashChip({ hash, truncate = true, label }) {
  const [copied, setCopied] = useState(false);

  if (!hash) return <span className="text-slate-500 font-mono text-xs">N/A</span>;

  const display = truncate && hash.length > 16 ? `${hash.slice(0, 8)}...${hash.slice(-6)}` : hash;

  const handleCopy = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      title={`Click to copy: ${hash}`}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-mono text-xs transition"
    >
      {label && <span className="text-slate-500 font-sans">{label}:</span>}
      <span>{display}</span>
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
    </button>
  );
}
