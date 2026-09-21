'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

type SheetSide = 'bottom' | 'right';

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Extra buttons in the header, left of the close button. */
  actions?: React.ReactNode;
  side?: SheetSide;
  className?: string;
  children: React.ReactNode;
};

const SIDE_CLASSES: Record<SheetSide, string> = {
  bottom: 'bottom-0 left-0 right-0 max-h-[90dvh] rounded-t-2xl',
  right:  'right-0 top-0 bottom-0 w-full max-w-md rounded-l-2xl',
};

const ANIM_CLASSES: Record<SheetSide, string> = {
  bottom: 'animate-sheet-in',
  right:  'animate-sheet-in',
};

export const Sheet = ({
  open,
  onClose,
  title,
  actions,
  side = 'bottom',
  className = '',
  children,
}: SheetProps) => {
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
      className="fixed inset-0 z-50 animate-fade-in"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div
        ref={panelRef}
        className={[
          'absolute bg-app-panel shadow-lg flex flex-col',
          SIDE_CLASSES[side],
          ANIM_CLASSES[side],
          className,
        ].join(' ')}
      >
        {/* Handle (bottom sheets only) */}
        {side === 'bottom' && (
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-app-line" aria-hidden="true" />
        )}

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-app-line">
            <h2 className="min-w-0 truncate text-[16px] font-semibold text-app-ink">{title}</h2>
            <div className="flex shrink-0 items-center gap-2">
              {actions}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close sheet"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-app-muted transition-colors hover:bg-app-sunken hover:text-app-ink focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:outline-none"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
};
