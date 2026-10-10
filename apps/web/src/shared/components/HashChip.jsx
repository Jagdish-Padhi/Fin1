import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function HashChip({ hash, truncate = true, label }) {
  const [copied, setCopied] = useState(false);

  if (!hash) return <span className="text-trust-text-subtle font-mono text-xs">N/A</span>;

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
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-trust-border hover:border-trust-secondary hover:bg-white text-trust-text font-mono text-xs transition shadow-subtle"
    >
      {label && <span className="text-trust-text-muted font-sans text-xs font-medium">{label}:</span>}
      <span className="text-xs font-semibold">{display}</span>
      {copied ? (
        <Check className="w-3 h-3 text-trust-success" />
      ) : (
        <Copy className="w-3 h-3 text-trust-text-muted" />
      )}
    </button>
  );
}
