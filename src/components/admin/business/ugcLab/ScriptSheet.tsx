'use client';

import { useEffect } from 'react';
import { SecondaryButton } from './ui';

type ScriptSheetProps = {
  author: string;
  hook: string;
  script: string;
  onUseHook: () => void;
  onClose: () => void;
};

/** The full spoken script of one research video. Bottom sheet on phones, centered dialog on desktop. */
export function ScriptSheet({ author, hook, script, onUseHook, onClose }: ScriptSheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Script from @${author}`}
        className="flex max-h-[85vh] w-full flex-col gap-3 rounded-t-2xl bg-white p-4 shadow-sm sm:max-w-lg sm:rounded-2xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="truncate text-[15px] font-semibold text-ink">Script · @{author}</h3>
          <SecondaryButton onClick={onClose}>Close</SecondaryButton>
        </div>
        {hook && (
          <p className="rounded-xl bg-surface-alt p-3 text-[13px] leading-snug text-ink">
            <span className="block text-[11px] font-medium uppercase tracking-wide text-muted">Hook</span>
            {hook}
          </p>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {script ? (
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{script}</p>
          ) : (
            <p className="text-[13px] italic text-subtle">No script found for this video. It may have no speech.</p>
          )}
        </div>
        {hook && (
          <button
            type="button"
            onClick={onUseHook}
            className="min-h-11 rounded-xl bg-ink px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Use this hook
          </button>
        )}
      </div>
    </div>
  );
}
