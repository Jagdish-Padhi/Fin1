import React from 'react';
import { X, QrCode, ShieldCheck, Printer, CheckCircle2 } from 'lucide-react';

export function AssetPassportStickerModal({ isOpen, onClose, asset }) {
  if (!isOpen || !asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F2A43]/40 backdrop-blur-sm">
      <div className="bg-white border border-[#D8E0E8] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-[#D8E0E8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
            <h3 className="text-sm font-bold text-[#17202A]">Physical Asset Passport Sticker</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#5A6A7E] hover:text-[#17202A] hover:bg-[#F8FAFC] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sticker Card Preview */}
        <div className="p-6 bg-[#F8FAFC]">
          <div className="p-5 rounded-2xl bg-white border-2 border-[#D8E0E8] text-center space-y-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#D8E0E8] pb-3">
              <span className="text-[11px] uppercase font-bold tracking-wider font-['Outfit',sans-serif]">
                <span className="text-[#0F2A43]">Asse</span>
                <span className="text-[#0F766E]">Trust</span>
                <span className="text-[#5A6A7E] ml-1.5 font-sans font-medium">Digital Passport</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0F766E]/10 text-[#0F766E] font-bold border border-[#0F766E]/20">
                {asset.typeKey}
              </span>
            </div>

            <div className="flex justify-center py-2">
              <div className="p-3 rounded-xl bg-white border border-[#D8E0E8] text-[#0F2A43] shadow-xs">
                <QrCode className="w-24 h-24" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-base font-bold text-[#17202A] tracking-tight">{asset.displayName}</div>
              <div className="font-mono text-xs text-[#0F766E] font-semibold">{asset.id}</div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#D8E0E8] text-[10px] font-mono text-[#5A6A7E] break-all space-y-1">
              <span className="text-[#17202A] block uppercase font-bold text-[9px] tracking-wider">Ledger Root Hash:</span>
              <span className="text-[#17202A]">{asset.attributesHash?.substring(0, 32)}...</span>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#18794E] font-semibold pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Cryptographically Anchored to Consortium Channel</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-[#D8E0E8] flex justify-end gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0F2A43] hover:bg-[#1F5A7A] text-white flex items-center gap-1.5 shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Asset Sticker</span>
          </button>
        </div>
      </div>
    </div>
  );
}
