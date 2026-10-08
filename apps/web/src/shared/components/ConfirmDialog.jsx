import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { ModalPortal } from './ModalPortal.jsx';

/**
 * Enterprise inline confirmation dialog — replaces browser confirm() calls.
 * Props:
 *   isOpen: boolean
 *   title: string
 *   message: string
 *   confirmLabel?: string (default: 'Confirm')
 *   cancelLabel?: string (default: 'Cancel')
 *   variant?: 'danger' | 'warning' | 'default' (default: 'default')
 *   onConfirm: () => void
 *   onCancel: () => void
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  const variantConfig = {
    danger: {
      headerBg: 'bg-[#FEF2F2]',
      iconColor: 'text-[#B42318]',
      confirmBtn: 'bg-[#B42318] hover:bg-[#991B1B] text-white',
    },
    warning: {
      headerBg: 'bg-[#FEFCE8]',
      iconColor: 'text-[#A16207]',
      confirmBtn: 'bg-[#A16207] hover:bg-[#854D0E] text-white',
    },
    default: {
      headerBg: 'bg-[#F0F4F8]',
      iconColor: 'text-[#1F5A7A]',
      confirmBtn: 'bg-[#0F2A43] hover:bg-[#1F5A7A] text-white',
    },
  };

  const cfg = variantConfig[variant] || variantConfig.default;

  return (
    <ModalPortal isOpen={isOpen} onClose={onCancel}>
      <div className="fixed inset-0 z-[999] bg-[#0F2A43]/50 backdrop-blur-sm flex items-center justify-center p-4 app-modal-backdrop">
        <div className="bg-white border border-[#D8E0E8] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden app-modal-content">
        {/* Header */}
        <div className={`p-5 ${cfg.headerBg} flex items-start gap-3`}>
          <AlertTriangle className={`w-6 h-6 shrink-0 mt-0.5 ${cfg.iconColor}`} />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-[#0F2A43]">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-[#5A6A7E] hover:bg-black/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-sm text-[#5A6A7E] leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-[#D8E0E8] text-xs font-semibold text-[#5A6A7E] hover:bg-[#F8FAFC] transition"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition shadow-sm ${cfg.confirmBtn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
