import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let _toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4500) => {
    const id = ++_toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration || 6000),
    warning: (msg, duration) => addToast(msg, 'warning', duration),
    info: (msg, duration) => addToast(msg, 'info', duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const show = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(show);
  }, []);

  const configs = {
    success: { Icon: CheckCircle2, iconClass: 'text-trust-success', title: 'Success' },
    error: { Icon: XCircle, iconClass: 'text-trust-error', title: 'Error' },
    warning: { Icon: AlertTriangle, iconClass: 'text-trust-warning', title: 'Warning' },
    info: { Icon: Info, iconClass: 'text-trust-secondary', title: 'Notice' },
  };

  const cfg = configs[toast.type] || configs.info;
  const { Icon } = cfg;

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg bg-white border border-trust-border shadow-popover transition-all duration-200 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
      role="alert"
    >
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.iconClass}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-trust-text">{cfg.title}</p>
        <p className="text-sm text-trust-text-muted mt-0.5 leading-snug">{toast.message}</p>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        aria-label="Dismiss"
        className="shrink-0 text-trust-text-subtle hover:text-trust-text p-0.5 rounded"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * Hook to use toast notifications throughout the app.
 * Usage: const toast = useToast();
 *        toast.success('Asset registered successfully!');
 *        toast.error('Failed to submit verification check.');
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
