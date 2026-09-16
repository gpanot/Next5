'use client';

import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import type { Toast as ToastType, ToastTone } from '../../hooks/useToast';

// ── Single toast ──────────────────────────────────────────────────────────────

type ToastProps = ToastType & { onDismiss: (id: string) => void };

const TONE_CONFIG: Record<ToastTone, { icon: React.ReactNode; cls: string }> = {
  success: {
    icon: <CheckCircle2 className="h-4 w-4 shrink-0 text-app-success" />,
    cls:  'border-app-success/20 bg-app-panel',
  },
  error: {
    icon: <AlertCircle className="h-4 w-4 shrink-0 text-app-danger" />,
    cls:  'border-app-danger/20 bg-app-panel',
  },
};

const ToastItem = ({ id, message, tone, onDismiss }: ToastProps) => {
  const { icon, cls } = TONE_CONFIG[tone];
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg',
        'animate-sheet-in',
        cls,
      ].join(' ')}
    >
      {icon}
      <p className="flex-1 text-[13px] text-app-ink">{message}</p>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss"
        className="shrink-0 text-app-muted transition-colors hover:text-app-ink"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

// ── Toast container ───────────────────────────────────────────────────────────

type ToastContainerProps = {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
};

export const ToastContainer = ({ toasts, onDismiss }: ToastContainerProps) => {
  if (toasts.length === 0) return null;
  return (
    <div
      // bottom-24 clears the phone tab bar, which would otherwise sit on top of the message.
      className="fixed bottom-24 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-2 lg:bottom-6"
      style={{ width: 'min(360px, calc(100vw - 32px))' }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} onDismiss={onDismiss} />
      ))}
    </div>
  );
};
