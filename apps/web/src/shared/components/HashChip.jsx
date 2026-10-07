import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function HashChip({ hash, truncate = true, label }) {
  const [copied, setCopied] = useState(false);

  if (!hash) return <span className="text-[#8795A5] font-mono text-xs">N/A</span>;

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
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#F8FAFC] border border-[#D8E0E8] hover:border-[#1F5A7A] hover:bg-white text-[#17202A] font-mono text-xs transition shadow-2xs"
    >
      {label && <span className="text-[#5A6A7E] font-sans text-[11px] font-medium">{label}:</span>}
      <span className="text-[11px] font-semibold">{display}</span>
      {copied ? (
        <Check className="w-3 h-3 text-[#18794E]" />
      ) : (
        <Copy className="w-3 h-3 text-[#5A6A7E]" />
      )}
    </button>
  );
}
