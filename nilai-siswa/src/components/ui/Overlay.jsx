import { useEffect, useRef } from 'react';
import { TriangleAlert, X } from 'lucide-react';
import { Button } from './Button';

/**
 * Escape closes, body scroll locks, focus moves in and returns on close.
 *
 * Two rules keep the on-screen keyboard stable on phones (in Android WebView a
 * focus move away from a text field dismisses the keyboard):
 * 1. The effect depends only on `open`, never on the identity of the handlers
 *    the parent passes in. Those are usually inline arrow functions, so an
 *    effect keyed on them re-runs on every keystroke and starts a focus
 *    tug-of-war between the panel and the field being typed into, which makes
 *    the keyboard flash open and closed.
 * 2. Focus is only pulled into the panel when it is not already inside it, so an
 *    autoFocus field the user is typing in is never disturbed.
 */
function useDialogBehavior(open, onClose, initialFocusRef) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const handleKey = (event) => {
      if (event.key === 'Escape') onCloseRef.current?.();
    };
    document.addEventListener('keydown', handleKey);
    const focusTimer = window.setTimeout(() => {
      const panel = initialFocusRef?.current;
      if (!panel) return;
      const active = document.activeElement;
      const sudahDiDalam = active instanceof HTMLElement && panel.contains(active);
      if (!sudahDiDalam) panel.focus();
    }, 60);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      if (previous instanceof HTMLElement && document.contains(previous)) previous.focus();
    };
  }, [open, initialFocusRef]);
}

export function Drawer({ open, onClose, title, description, children, footer }) {
  const initialFocusRef = useRef(null);
  useDialogBehavior(open, onClose, initialFocusRef);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end no-print">
      <div
        className="absolute inset-0 bg-[rgba(15,26,42,0.45)]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex h-full w-full max-w-[440px] flex-col rounded-l-xl border-l border-border bg-card shadow-layer"
        data-component="drawer"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <h2 className="text-headline-md">{title}</h2>
            {description ? (
              <p className="mt-1 max-w-[52ch] text-body-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 -mt-1 grid h-touch w-touch shrink-0 place-items-center rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground sm:h-8 sm:w-8"
            aria-label="Tutup panel"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div ref={initialFocusRef} tabIndex={-1} className="flex flex-col gap-4 outline-none">
            {children}
          </div>
        </div>

        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-6 py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  detail,
  confirmLabel = 'Hapus',
  busy = false,
}) {
  const initialFocusRef = useRef(null);
  useDialogBehavior(open, onClose, initialFocusRef);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 no-print">
      <div className="absolute inset-0 bg-[rgba(15,26,42,0.45)]" onClick={onClose} aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-[400px] rounded-lg border border-border bg-popover p-6 shadow-layer"
        data-component="confirm-dialog"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-danger-surface text-danger">
            <TriangleAlert size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-headline-sm">{title}</h2>
            <p className="mt-2 text-body-md text-muted-foreground">{message}</p>
            {detail ? <p className="mt-2 text-body-sm text-muted-foreground">{detail}</p> : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            ref={initialFocusRef}
            type="button"
            onClick={onClose}
            className="inline-flex min-h-touch items-center rounded-sm bg-secondary px-4 text-label-md font-medium text-secondary-foreground hover:bg-accent sm:min-h-control"
          >
            Batal
          </button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy ? 'Memproses…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
