import React from 'react';
import { X, QrCode, Printer, CheckCircle2 } from 'lucide-react';
import { ModalPortal } from '../../shared/components/ModalPortal.jsx';

export function AssetPassportStickerModal({ isOpen, onClose, asset }) {
  if (!isOpen || !asset) return null;

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-trust-primary/40">
      <div className="bg-white border border-trust-border rounded-lg w-full max-w-md shadow-popover overflow-hidden">
        <div className="p-4 border-b border-trust-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Logo" className="w-5 h-5 object-contain" />
            <h3 className="text-sm font-semibold text-trust-text">Physical Asset Passport</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-trust-text-muted hover:text-trust-text hover:bg-slate-50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sticker Card Preview */}
        <div className="p-6 bg-slate-50">
          <div className="p-5 rounded-lg bg-white border-2 border-trust-border text-center space-y-4 shadow-subtle relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-trust-border pb-3">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="AsseTrust" className="w-7 h-7 object-contain" />
                <span className="text-xs font-semibold">
                  <span className="text-trust-primary">Asse</span>
                  <span className="text-trust-accent">Trust</span>
                  <span className="text-trust-text-muted ml-1.5 font-sans font-medium text-xs">Passport</span>
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-trust-accent/10 text-trust-accent font-semibold border border-trust-accent/20">
                {asset.typeKey}
              </span>
            </div>

            <div className="flex justify-center py-2">
              <div className="p-3 rounded-lg bg-white border border-trust-border text-trust-primary shadow-subtle">
                <QrCode className="w-24 h-24" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-base font-semibold text-trust-text tracking-tight">{asset.displayName}</div>
              <div className="font-mono text-xs text-trust-accent font-semibold">{asset.id}</div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-trust-border text-xs font-mono text-trust-text-muted break-all space-y-1">
              <span className="text-trust-text block font-semibold text-xs">Root Hash:</span>
              <span className="text-trust-text">{asset.attributesHash?.substring(0, 32)}...</span>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-trust-success font-semibold pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Cryptographically Anchored to Ledger</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-trust-border flex justify-end gap-2">
          <button
            onClick={() => window.print()}
            className="trust-btn-primary"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Asset Sticker</span>
          </button>
        </div>
      </div>
    </div>
  </ModalPortal>
);
}
