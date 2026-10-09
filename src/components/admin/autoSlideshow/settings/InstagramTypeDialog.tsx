'use client';

import { useState } from 'react';

/** Instagram's own guide: switch a personal account to a professional one (free, a few taps). */
const SWITCH_GUIDE_URL = 'https://help.instagram.com/502981923235522';

type Props = { onBusiness: () => void; onClose: () => void };

const option = 'flex min-h-16 w-full items-center gap-3 rounded-xl border border-line bg-white p-4 text-left transition hover:border-blue-600 active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-900';

/** Shown on Instagram → Connect: only Business and Creator accounts can be posted to, so ask first. */
export function InstagramTypeDialog({ onBusiness, onClose }: Props) {
  const [personal, setPersonal] = useState(false);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Your Instagram account" onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-4 rounded-t-2xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl dark:bg-zinc-950">
        <div className="flex items-start gap-3">
          <h3 className="flex-1 text-lg font-extrabold text-ink dark:text-zinc-100">{personal ? 'Switch to a professional account first' : 'What is your Instagram account?'}</h3>
          <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-zinc-100 dark:hover:bg-zinc-800">✕</button>
        </div>
        {personal ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">Instagram lets apps post only to <span className="font-semibold text-ink dark:text-zinc-100">Business</span> or <span className="font-semibold text-ink dark:text-zinc-100">Creator</span> accounts. A personal account cannot be connected.</p>
            <p className="text-sm text-muted">Switching is free and takes a minute. Your posts and followers stay. In the Instagram app: Settings → Account type and tools → Switch to professional account.</p>
            <a href={SWITCH_GUIDE_URL} target="_blank" rel="noreferrer" className="flex min-h-12 w-full items-center justify-center rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition hover:bg-app-cta/90 active:scale-95">How to switch (Instagram help) ↗</a>
            <button onClick={() => setPersonal(false)} className="min-h-11 w-full text-sm font-semibold text-muted">I switched, go back</button>
          </div>
        ) : (
          <div className="space-y-2">
            <button onClick={onBusiness} className={option}>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-ink dark:text-zinc-100">Business or Creator</span>
                <span className="block text-xs text-muted">Connect it now</span>
              </span>
              <span aria-hidden className="text-muted">›</span>
            </button>
            <button onClick={() => setPersonal(true)} className={option}>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-ink dark:text-zinc-100">Personal</span>
                <span className="block text-xs text-muted">See what to do first</span>
              </span>
              <span aria-hidden className="text-muted">›</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
