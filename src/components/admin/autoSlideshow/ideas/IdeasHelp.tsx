'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, CircleHelp, Info, Mic, Pause, X } from 'lucide-react';

/** Set once the How to? popup was closed: it no longer opens on its own. */
const SEEN_KEY = 'next5:ideas-help-seen';

const seen = (): boolean => {
  try {
    return window.localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
};

const rememberSeen = () => {
  try {
    window.localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Storage blocked: the popup opens again next visit.
  }
};

const chip = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';

type Step = { icon: ReactNode; title: string; text: string };

const STEPS: Step[] = [
  { icon: <span className={`${chip} border-app-cta bg-app-cta text-app-cta-ink`}><Check aria-hidden className="h-5 w-5" /></span>, title: 'Like it? Swipe right', text: 'We make the video and put it on your calendar. It uses 1 credit.' },
  { icon: <span className={chip}><X aria-hidden className="h-5 w-5" /></span>, title: 'Not for you? Swipe left', text: 'It goes away. No credit used.' },
  { icon: <span className={`${chip} w-auto px-3 text-xs font-semibold`}>Hook</span>, title: 'Change the first words', text: 'Pick other words for the top of the video.' },
  { icon: <span className={chip}><Mic aria-hidden className="h-4 w-4" /></span>, title: 'Change the voice', text: 'Tap to switch between a woman and a man.' },
  { icon: <span className={chip}><Pause aria-hidden className="h-4 w-4" /></span>, title: 'Pause to swap a clip', text: 'Stop the video, then get a new photo or clip.' },
  { icon: <span className={chip}><Info aria-hidden className="h-4 w-4" /></span>, title: 'Why this?', text: 'See why we picked this idea for you.' },
];

function HowToDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  // On <body>: the deck may sit in the calendar's sticky rail, whose stacking context would cover the popup.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex animate-fade-in items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="ideas-help-title" onClick={(e) => e.stopPropagation()} className="max-h-[90dvh] w-full max-w-md animate-sheet-in space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl dark:bg-zinc-950">
        <div>
          <h3 id="ideas-help-title" className="text-lg font-extrabold text-ink dark:text-zinc-100">How to?</h3>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">Each card is a video idea for your page.</p>
        </div>
        <ul className="space-y-3">
          {STEPS.map((step) => (
            <li key={step.title} className="flex items-center gap-3">
              {step.icon}
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink dark:text-zinc-100">{step.title}</p>
                <p className="text-sm leading-snug text-zinc-700 dark:text-zinc-300">{step.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <button type="button" autoFocus onClick={onClose} className="min-h-12 w-full rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition hover:bg-app-cta/90 active:scale-95">
          Got it
        </button>
      </div>
    </div>,
    document.body,
  );
}

/**
 * The "?" beside the Ideas title: opens How to?, a short guide to the deck's buttons. `auto`: it also opens on its own
 * the first time the deck shows (once per browser).
 */
export function IdeasHelp({ auto }: { auto: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (auto && !seen()) setOpen(true);
  }, [auto]);
  const close = () => {
    rememberSeen();
    setOpen(false);
  };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="How to use ideas" title="How to?" className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-full text-app-muted transition hover:text-app-ink active:scale-90">
        <CircleHelp aria-hidden className="h-5 w-5" />
      </button>
      {open && <HowToDialog onClose={close} />}
    </>
  );
}
