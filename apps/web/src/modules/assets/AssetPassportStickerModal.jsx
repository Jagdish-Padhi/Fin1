import React from 'react';
import { X, QrCode, ShieldCheck, Printer, CheckCircle2 } from 'lucide-react';

export function AssetPassportStickerModal({ isOpen, onClose, asset }) {
  if (!isOpen || !asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Physical Asset Passport Sticker</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sticker Card Preview */}
        <div className="p-6">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950 border-2 border-indigo-500/40 text-center space-y-4 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                EkamVistar Digital Passport
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                {asset.typeKey}
              </span>
            </div>

            <div className="flex justify-center py-2">
              <div className="p-3 rounded-xl bg-white text-slate-950 shadow-md">
                <QrCode className="w-24 h-24" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-base font-bold text-white tracking-tight">{asset.displayName}</div>
              <div className="font-mono text-xs text-indigo-300">{asset.id}</div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[10px] font-mono text-slate-400 break-all space-y-1">
              <span className="text-slate-500 block uppercase font-semibold">Ledger Root Hash:</span>
              <span>{asset.attributesHash?.substring(0, 32)}...</span>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-400 font-semibold pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Cryptographically Anchored to Consortium Channel</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Asset Sticker</span>
          </button>
        </div>
      </div>
    </div>
  );
}
