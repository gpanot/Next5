'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../../../hooks/useFocusTrap';

type Props = {
  /** Caption and hashtags, then the post form. */
  children: ReactNode;
  onClose: () => void;
};

/** Under the caption while it has unsaved edits: stores them, so the post goes out with them. */
export function SaveCaptionButton({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={saving}
      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-500 text-sm font-semibold text-white transition hover:bg-emerald-400 active:scale-95 disabled:opacity-50"
    >
      {saving && <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
      {saving ? 'Saving…' : 'Save caption'}
    </button>
  );
}

/** "Send to TikTok/Instagram": the caption and the post form over the editor. A sheet on phones, a centered box on wider screens. */
export function PostDialog({ children, onClose }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  useFocusTrap(panel, true);

  // Focus moves in once, on open (not on every render, or typing in the caption would lose it).
  useEffect(() => {
    panel.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Closes this dialog only, not the editor under it.
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-dialog-title"
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-white/10 bg-zinc-950 text-white shadow-2xl outline-none sm:max-w-lg sm:rounded-2xl"
      >
        <header className="flex min-h-14 shrink-0 items-center gap-2 border-b border-white/10 px-4">
          <h2 id="post-dialog-title" className="flex-1 text-base font-semibold">Send to TikTok/Instagram</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-white/10 active:scale-95">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
