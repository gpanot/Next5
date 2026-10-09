'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Set once the user ticks "Don't show me again": later swipes right keep without asking. */
const SKIP_KEY = 'next5:keep-confirm-off';

const skipped = (): boolean => {
  try {
    return window.localStorage.getItem(SKIP_KEY) === '1';
  } catch {
    return false;
  }
};

const rememberSkip = () => {
  try {
    window.localStorage.setItem(SKIP_KEY, '1');
  } catch {
    // Storage blocked: the dialog shows again next time.
  }
};

const button = 'min-h-12 flex-1 rounded-full px-5 text-sm font-semibold transition active:scale-95';

function KeepDialog({ credits, onAnswer }: { credits: number; onAnswer: (ok: boolean, dontShow: boolean) => void }) {
  const [dontShow, setDontShow] = useState(false);
  // On <body>: the deck sits in the calendar's sticky rail, whose stacking context would put the calendar tiles on top.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center" onClick={() => onAnswer(false, false)}>
      <div role="dialog" aria-modal="true" aria-labelledby="keep-confirm-title" onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-4 rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl dark:bg-zinc-950">
        <h3 id="keep-confirm-title" className="text-lg font-extrabold text-ink dark:text-zinc-100">You are about to use {credits} {credits === 1 ? 'credit' : 'credits'}</h3>
        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          You can still edit the video before it gets posted on your social media. Deleting a video or a slideshow gives the credit back.
        </p>
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} className="h-5 w-5 rounded accent-blue-600" />
          Don&apos;t show me again
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={() => onAnswer(false, false)} className={`${button} border border-line text-ink hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800`}>Cancel</button>
          <button type="button" autoFocus onClick={() => onAnswer(true, dontShow)} className={`${button} bg-app-cta text-app-cta-ink shadow-sm hover:bg-app-cta/90`}>Got it</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Asks before a swipe right uses a credit (until "Don't show me again"). `confirm` resolves true to go on; `dialog`
 * is rendered by the caller.
 */
export function useKeepConfirm(): { confirm: (credits: number) => Promise<boolean>; dialog: ReactNode } {
  const [asking, setAsking] = useState<number | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const confirm = useCallback((credits: number) => {
    if (skipped()) return Promise.resolve(true);
    setAsking(credits);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);
  const answer = (ok: boolean, dontShow: boolean) => {
    if (ok && dontShow) rememberSkip();
    setAsking(null);
    resolver.current?.(ok);
    resolver.current = null;
  };
  return { confirm, dialog: asking === null ? null : <KeepDialog credits={asking} onAnswer={answer} /> };
}
