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
    success: {
      Icon: CheckCircle2,
      containerClass: 'bg-white border-l-4 border-[#18794E] shadow-lg',
      iconClass: 'text-[#18794E]',
      titleClass: 'text-[#18794E]',
      title: 'Success',
    },
    error: {
      Icon: XCircle,
      containerClass: 'bg-white border-l-4 border-[#B42318] shadow-lg',
      iconClass: 'text-[#B42318]',
      titleClass: 'text-[#B42318]',
      title: 'Error',
    },
    warning: {
      Icon: AlertTriangle,
      containerClass: 'bg-white border-l-4 border-[#A16207] shadow-lg',
      iconClass: 'text-[#A16207]',
      titleClass: 'text-[#A16207]',
      title: 'Warning',
    },
    info: {
      Icon: Info,
      containerClass: 'bg-white border-l-4 border-[#1F5A7A] shadow-lg',
      iconClass: 'text-[#1F5A7A]',
      titleClass: 'text-[#1F5A7A]',
      title: 'Notice',
    },
  };

  const cfg = configs[toast.type] || configs.info;
  const { Icon } = cfg;

  return (
    <div
      className={`
        pointer-events-auto flex items-start gap-3 p-4 rounded-xl border border-[#E8EEF3]
        ${cfg.containerClass}
        transition-all duration-300
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
      role="alert"
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${cfg.iconClass}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold ${cfg.titleClass}`}>{cfg.title}</p>
        <p className="text-xs text-[#374151] mt-0.5 leading-relaxed">{toast.message}</p>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 text-[#9CA3AF] hover:text-[#374151] transition p-0.5 rounded"
      >
        <X className="w-3.5 h-3.5" />
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
