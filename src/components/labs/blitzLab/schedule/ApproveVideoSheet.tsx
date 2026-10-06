'use client';

import { Loader2, Pencil, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { BlitzScheduleDto } from '../../../../types/admin/blitzSchedule';
import { errorOf } from '../../labClient';
import { useLabClient } from '../../LabClientProvider';
import { CoverMedia } from '../../addToCalendar/CoverMedia';
import { PostChoicesForm } from './PostChoicesForm';
import { scheduleApi } from './scheduleApi';
import { whenLabel } from '../../addToCalendar/slots';
import { usePostChoices, type PostChoices } from './usePostChoices';
import { VideoPreview } from './VideoPreview';

/** `editHref`: where the video opens in the Blitz editor (it is not made yet, so it can still change). */
type Props = { item: BlitzScheduleDto; onClose: () => void; onChanged: () => void; editHref?: string };

/** Approve, or remove, one video; resolves the error text or null. */
function useApprove({ item, onClose, onChanged }: Props, choices: PostChoices) {
  const client = useLabClient();
  const [busy, setBusy] = useState<'approve' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async (how: 'approve' | 'remove') => {
    setBusy(how);
    setError(null);
    const res = await (how === 'approve' ? scheduleApi.approve(client, item.id, choices.request()) : scheduleApi.cancel(client, item.id)).catch(() => null);
    setBusy(null);
    if (!res?.ok) return setError(res ? errorOf(res) : 'Could not reach the server. Check your connection.');
    onChanged();
    onClose();
  };
  return { busy, error, setError, run };
}

/**
 * A planned Blitz video on the calendar: the user approves it here, picking where it posts (TikTok or YouTube Shorts)
 * and that platform's choices (connecting the account first when needed), like the slideshows. Also removes it (its credit comes back).
 */
export function ApproveVideoSheet(props: Props) {
  const { item, onClose } = props;
  const choices = usePostChoices();
  const f = useApprove(props, choices);
  // The button stays green: a tap says what is missing instead of a greyed-out button that says nothing.
  const approve = () => {
    const missing = choices.check();
    if (missing) return f.setError(missing);
    void f.run('approve');
  };
  // Not made yet: it plays as a deck card and can still be edited.
  const editable = item.status === 'planned' || item.status === 'scheduled';
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Approve video" onClick={(e) => e.stopPropagation()} className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-2xl bg-[var(--paper,#fff)] shadow-xl sm:rounded-2xl dark:bg-neutral-950">
        <header className="flex items-center gap-3 border-b border-[var(--line,#e8e5e1)] p-4 dark:border-neutral-800">
          <h3 className="min-w-0 flex-1 text-[16px] font-bold text-[var(--ink,#000)] dark:text-neutral-100">{item.status === 'scheduled' ? 'Video approved' : 'Approve video'}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-[var(--mute,#7c7d82)] transition hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X aria-hidden className="h-5 w-5" />
          </button>
        </header>
        <div className="space-y-4 overflow-y-auto p-4">
          {editable ? <VideoPreview id={item.id} title={item.title} /> : (
            <span className="mx-auto block h-20 w-16 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
              {item.coverUrl && <CoverMedia src={item.coverUrl} video={item.coverIsVideo} />}
            </span>
          )}
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[14px] font-semibold text-[var(--ink,#000)] dark:text-neutral-100">{item.title}</p>
              <p className="text-[13px] text-[var(--mute,#7c7d82)]">{whenLabel(new Date(item.scheduledAt))}</p>
            </div>
            {editable && props.editHref && (
              <Link href={props.editHref} className="inline-flex min-h-11 flex-none items-center gap-1.5 rounded-full border border-[var(--line,#e8e5e1)] px-4 text-[14px] font-semibold text-[var(--ink,#000)] transition hover:bg-neutral-50 active:scale-95 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800">
                <Pencil aria-hidden className="h-4 w-4" /> Edit
              </Link>
            )}
          </div>
          <PostChoicesForm choices={choices} />
          {f.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{f.error}</p>}
        </div>
        <footer className="flex gap-2 border-t border-[var(--line,#e8e5e1)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-neutral-800">
          <button type="button" onClick={() => void f.run('remove')} disabled={f.busy !== null} className="flex min-h-12 items-center justify-center gap-1.5 rounded-full border border-[var(--line,#e8e5e1)] px-5 text-[14px] font-semibold text-red-600 transition active:scale-95 disabled:opacity-40 dark:border-neutral-700 dark:text-red-400">
            {f.busy === 'remove' && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />} Remove
          </button>
          <button type="button" onClick={approve} disabled={f.busy !== null} className="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--ready,#1e8049)] px-4 text-[14px] font-semibold text-white shadow-sm transition active:scale-95 disabled:opacity-40">
            {f.busy === 'approve' && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
            {item.status === 'scheduled' ? 'Save' : 'Approve & post'}
          </button>
        </footer>
      </div>
    </div>
  );
}
