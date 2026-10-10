import React from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';
import { ModalPortal } from './ModalPortal.jsx';

/**
 * Confirmation dialog — replaces browser confirm() calls.
 * Props:
 *   isOpen, title, message, onConfirm, onCancel
 *   confirmLabel?: string (default: 'Confirm')
 *   cancelLabel?: string (default: 'Cancel')
 *   variant?: 'danger' | 'warning' | 'default'
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

  const variants = {
    danger: { Icon: AlertTriangle, icon: 'bg-red-50 text-trust-error', btn: 'trust-btn-danger' },
    warning: { Icon: AlertTriangle, icon: 'bg-amber-50 text-trust-warning', btn: 'trust-btn-primary' },
    default: { Icon: Info, icon: 'bg-sky-50 text-trust-secondary', btn: 'trust-btn-primary' },
  };
  const { Icon, icon, btn } = variants[variant] || variants.default;

  return (
    <ModalPortal isOpen={isOpen} onClose={onCancel}>
      <div
        className="fixed inset-0 z-[999] bg-slate-900/40 flex items-center justify-center p-4 app-modal-backdrop"
        onClick={onCancel}
      >
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onClick={(e) => e.stopPropagation()}
          className="bg-white border border-trust-border rounded-lg max-w-md w-full shadow-popover app-modal-content"
        >
          <div className="p-5 flex items-start gap-4">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${icon}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 id="confirm-title" className="text-base font-semibold text-trust-text">
                {title}
              </h3>
              <p className="mt-1.5 text-sm text-trust-text-muted leading-relaxed">{message}</p>
            </div>
            <button
              onClick={onCancel}
              aria-label="Close"
              className="p-1 -m-1 rounded-md text-trust-text-subtle hover:text-trust-text hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-3 bg-slate-50 border-t border-trust-border-subtle rounded-b-lg flex justify-end gap-2">
            <button onClick={onCancel} className="trust-btn-secondary">
              {cancelLabel}
            </button>
            <button onClick={onConfirm} className={btn}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
