'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
};

export const Dialog = ({
  open,
  onClose,
  title,
  description,
  className = '',
  children,
}: DialogProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      aria-describedby={description ? 'dialog-desc' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={[
          'relative z-10 w-full max-w-lg rounded-2xl bg-app-panel shadow-lg',
          'animate-sheet-in',
          className,
        ].join(' ')}
      >
        <div className="flex items-start justify-between p-6 pb-0">
          <div>
            {title && <h2 className="text-[18px] font-semibold text-app-ink">{title}</h2>}
            {description && <p id="dialog-desc" className="mt-1 text-[13px] text-app-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="ml-4 flex h-8 w-8 items-center justify-center rounded-lg text-app-muted transition-colors hover:bg-app-sunken hover:text-app-ink focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
