import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CircleAlert, Check, Info, TriangleAlert, X } from 'lucide-react';

const ToastContext = createContext(null);

const TONES = {
  success: { icon: Check, className: 'bg-success-surface text-success border-success/25' },
  error: { icon: CircleAlert, className: 'bg-danger-surface text-danger border-danger/25' },
  warning: { icon: TriangleAlert, className: 'bg-warning-surface text-warning border-warning/25' },
  info: { icon: Info, className: 'bg-info-surface text-info border-info/25' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast) => {
      const id = `t_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      setToasts((current) => [...current, { id, tone: 'info', ...toast }]);
      window.setTimeout(() => dismiss(id), toast.duration ?? 5000);
      return id;
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      success: (title, description) => push({ tone: 'success', title, description }),
      error: (title, description) => push({ tone: 'error', title, description, duration: 8000 }),
      warning: (title, description) => push({ tone: 'warning', title, description }),
      info: (title, description) => push({ tone: 'info', title, description }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,380px)] flex-col gap-2 no-print"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const tone = TONES[toast.tone] || TONES.info;
          const Icon = tone.icon;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-md border px-4 py-3 shadow-layer ${tone.className}`}
              data-component="toast"
            >
              <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-label-md font-medium">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-1 text-body-sm opacity-90">{toast.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-sm hover:bg-black/5"
                aria-label="Tutup notifikasi"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast harus dipakai di dalam ToastProvider.');
  return context;
}
