'use client';

import { Loader2, Pencil, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AutoSlideshowDto, RunAccountsDto } from '../../../../types/admin/autoSlideshow';
import { whenLabel } from '../../../labs/addToCalendar/slots';
import { ChangeDay } from '../../../labs/blitzLab/schedule/ChangeDay';
import { adminFetch } from '../../business/useAdminApi';
import { SlidePreview } from '../SlidePreview';
import type { usePosting } from '../usePosting';
import { SlideshowChoicesForm, useSlideshowChoices } from './SlideshowChoices';

type Props = {
  token: string;
  runId: string;
  show: AutoSlideshowDto;
  /** Its time on the calendar. */
  at: Date;
  posting: ReturnType<typeof usePosting>;
  /** Opens it in the editor (a campaign's slideshow opens its campaign). */
  onEdit: () => void;
  /** Moves it to another day (its time comes from that day's slots). */
  onMove: (at: Date) => void;
  /** After it was approved or posted: re-read the calendar. */
  onDone: () => void;
  onClose: () => void;
};

const pill = 'inline-flex min-h-11 flex-none items-center gap-1.5 rounded-full border border-[var(--line,#e8e5e1)] px-4 text-[14px] font-semibold text-[var(--ink,#000)] transition hover:bg-neutral-50 active:scale-95 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800';
const alert = 'rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300';

/** Closes the sheet on Escape. */
function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
}

/** Approve on its day, or post it now: the slideshow's choices go to the schedule or straight to the platforms. */
function useApprove({ token, runId, show, at, posting, onDone, onClose }: Props, accounts: RunAccountsDto) {
  const choices = useSlideshowChoices(token, runId, accounts);
  const [postNow, setPostNow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const approve = async () => {
    const missing = choices.problem();
    if (missing) return setError(missing);
    setBusy(true);
    setError(null);
    const req = choices.request();
    const ok = postNow
      ? await adminFetch(token, `/api/admin/auto-slideshow/runs/${runId}/slideshows/${show.id}/post`, { method: 'POST', body: JSON.stringify({ workspaceId: accounts.workspaceId, ...req }) })
        .then(() => true)
        .catch((err: unknown) => (setError(err instanceof Error ? err.message : 'Could not post'), false))
      : await posting.schedule({ ...req, items: [{ slideshowId: show.id, scheduledAt: at.toISOString() }] });
    setBusy(false);
    if (!ok) return;
    onDone();
    onClose();
  };
  return { choices, postNow, setPostNow, busy, error: error ?? posting.error, approve };
}

/** The form part, once the workspace's accounts are known. */
function Body(props: Props & { accounts: RunAccountsDto }) {
  const { show, at, onEdit, onMove, onClose } = props;
  const a = useApprove(props, props.accounts);
  const [index, setIndex] = useState(0);
  return (
    <>
      <div className="space-y-4 overflow-y-auto p-4">
        <div className="mx-auto w-[min(56vw,220px)] overflow-hidden rounded-[26px] shadow-sm">
          <SlidePreview show={show} index={index} onIndex={setIndex} working={false} />
        </div>
        <div className="space-y-3">
          <div className="min-w-0">
            <p className="line-clamp-2 text-[14px] font-semibold text-[var(--ink,#000)] dark:text-neutral-100">{show.slides[0]?.title || show.topic}</p>
            <p className="text-[13px] text-[var(--mute,#7c7d82)]">{a.postNow ? 'Now' : whenLabel(at)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onEdit} className={pill}><Pencil aria-hidden className="h-4 w-4" /> Edit</button>
            {!a.postNow && <ChangeDay scheduledAt={at.toISOString()} busy={false} onMove={onMove} />}
            <label className={`${pill} cursor-pointer ${a.postNow ? 'border-[var(--ready,#1e8049)] dark:border-[var(--ready,#1e8049)]' : ''}`}>
              <input type="checkbox" checked={a.postNow} onChange={(e) => a.setPostNow(e.target.checked)} className="h-4 w-4 accent-[var(--ready,#1e8049)]" />
              Post now
            </label>
          </div>
        </div>
        <SlideshowChoicesForm c={a.choices} />
        {a.error && <p role="alert" className={alert}>{a.error}</p>}
      </div>
      <footer className="flex gap-2 border-t border-[var(--line,#e8e5e1)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-neutral-800">
        <button type="button" onClick={onClose} className="flex min-h-12 items-center justify-center rounded-full border border-[var(--line,#e8e5e1)] px-5 text-[14px] font-semibold text-[var(--ink,#000)] transition active:scale-95 dark:border-neutral-700 dark:text-neutral-100">
          Cancel
        </button>
        <button type="button" onClick={() => void a.approve()} disabled={a.busy || a.choices.blocked !== null} title={a.choices.blocked ?? undefined} className="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--ready,#1e8049)] px-4 text-[14px] font-semibold text-white shadow-sm transition active:scale-95 disabled:opacity-40">
          {a.busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
          {a.postNow ? 'Post now' : 'Approve & post'}
        </button>
      </footer>
    </>
  );
}

/**
 * One ready slideshow (or campaign slideshow), opened from the calendar: the same approval as a Blitz video. It plays,
 * and the user edits it, moves it to another day, or approves it with its platforms and TikTok's choices, on its day
 * or right now.
 */
export function SlideshowSheet(props: Props) {
  const { posting, onClose } = props;
  useEscape(onClose);
  const accounts = posting.accounts;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Approve slideshow" onClick={(e) => e.stopPropagation()} className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-2xl bg-[var(--paper,#fff)] shadow-xl sm:rounded-2xl dark:bg-neutral-950">
        <header className="flex items-center gap-3 border-b border-[var(--line,#e8e5e1)] p-4 dark:border-neutral-800">
          <h3 className="min-w-0 flex-1 text-[16px] font-bold text-[var(--ink,#000)] dark:text-neutral-100">Approve slideshow</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-[var(--mute,#7c7d82)] transition hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X aria-hidden className="h-5 w-5" />
          </button>
        </header>
        {accounts?.workspaceId
          ? <Body {...props} accounts={accounts} />
          : posting.accountsError
            ? <p role="alert" className={`m-4 ${alert}`}>{posting.accountsError}</p>
            : accounts
              ? <p className="m-4 text-[13px] text-[var(--mute,#7c7d82)]">Connect TikTok, Instagram or YouTube in Settings → Accounts first.</p>
              : <div className="m-4 h-64 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" aria-label="Loading" />}
      </div>
    </div>
  );
}
