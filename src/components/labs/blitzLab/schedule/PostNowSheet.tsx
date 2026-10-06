'use client';

import { CheckCircle2, Loader2, X } from 'lucide-react';
import { BLITZ_PLATFORM_LABELS } from '../../../../types/admin/blitzSchedule';
import { useEffect, useState } from 'react';
import type { DeckCardData } from '../SwipeDeck';
import { PostChoicesForm } from './PostChoicesForm';
import { titleOf, type BodyFor } from './ScheduleSheet';
import type { BlitzSchedule } from './useBlitzSchedule';
import { usePostChoices } from './usePostChoices';

type Props = { card: DeckCardData; schedule: BlitzSchedule; bodyFor: BodyFor; onClose: () => void };

/**
 * "Post now" for a kept Blitz video already made with Generate, the same choices as approving one on the calendar:
 * where it posts (TikTok or YouTube Shorts) and that platform's options. The made video is uploaded at once, free.
 */
export function PostNowSheet({ card, schedule, bodyFor, onClose }: Props) {
  const choices = usePostChoices();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const send = async () => {
    const missing = choices.check();
    if (missing) return setError(missing);
    setBusy(true);
    setError(null);
    const built = await bodyFor(card).catch(() => ({ error: 'Could not prepare this video. Try again.' }));
    const failure = 'error' in built ? built.error : await schedule.postNow({ cardId: card.id, variantId: card.variantId, title: titleOf(card), tzOffsetMin: new Date().getTimezoneOffset(), renderBody: built.body, projectId: card.renderProjectId, ...choices.request() });
    setBusy(false);
    if (failure) return setError(failure);
    setStarted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Post now" onClick={(e) => e.stopPropagation()} className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-2xl bg-[var(--paper,#fff)] shadow-xl sm:rounded-2xl dark:bg-neutral-950">
        <header className="flex items-center gap-3 border-b border-[var(--line,#e8e5e1)] p-4 dark:border-neutral-800">
          <h3 className="min-w-0 flex-1 text-[16px] font-bold text-[var(--ink,#000)] dark:text-neutral-100">Post now</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-[var(--mute,#7c7d82)] transition hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X aria-hidden className="h-5 w-5" />
          </button>
        </header>
        {started ? <Started platform={choices.platform} onDone={onClose} /> : (<>
        <div className="space-y-4 overflow-y-auto p-4">
          <p className="line-clamp-2 text-[14px] font-semibold text-[var(--ink,#000)] dark:text-neutral-100">{titleOf(card)}</p>
          <PostChoicesForm choices={choices} />
          <p className="text-[12.5px] text-[var(--mute,#7c7d82)]">Posts the video you made, right now. No extra credit.</p>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p>}
        </div>
        <footer className="border-t border-[var(--line,#e8e5e1)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-neutral-800">
          <button type="button" onClick={() => void send()} disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-full bg-[var(--ready,#1e8049)] px-4 text-[14px] font-semibold text-white shadow-sm transition active:scale-95 disabled:opacity-40">
            {busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />} Post now
          </button>
        </footer>
        </>)}
      </div>
    </div>
  );
}

/** After Post now: says what happens next, so nobody wonders whether anything started. */
function Started({ platform, onDone }: { platform: 'tiktok' | 'youtube'; onDone: () => void }) {
  const where = BLITZ_PLATFORM_LABELS[platform];
  return (
    <>
      <div className="space-y-3 p-6 text-center">
        <CheckCircle2 aria-hidden className="mx-auto h-10 w-10 text-[var(--ready,#1e8049)]" />
        <p className="text-[16px] font-bold text-[var(--ink,#000)] dark:text-neutral-100">Your video is on its way</p>
        <p className="text-[13.5px] text-[var(--mute,#7c7d82)]">Posting it to <b className="text-[var(--ink,#000)] dark:text-neutral-100">{where}</b> now. It usually takes a minute or two.</p>
        <p className="text-[13px] text-[var(--mute,#7c7d82)]">Follow it in the Library tab. Once live, the video shows &ldquo;Posted&rdquo; with the date and time.</p>
      </div>
      <footer className="border-t border-[var(--line,#e8e5e1)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-neutral-800">
        <button type="button" onClick={onDone} className="min-h-12 w-full rounded-full bg-[var(--ink,#000)] px-4 text-[14px] font-semibold text-white transition active:scale-95 dark:bg-white dark:text-black">Done</button>
      </footer>
    </>
  );
}
