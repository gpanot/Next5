'use client';

import { ExternalLink, Loader2, Pencil, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import type { BlitzScheduleDto, BlitzScheduleStatus } from '../../../../types/admin/blitzSchedule';
import { CoverMedia } from '../../addToCalendar/CoverMedia';
import { whenLabel } from '../../addToCalendar/slots';
import { ChangeDay } from './ChangeDay';
import { PostChoicesForm } from './PostChoicesForm';
import { usePostChoices } from './usePostChoices';
import { useVideoSheet, type VideoSheetActions } from './useVideoSheet';
import { VideoPreview } from './VideoPreview';

/** `editHref`: where the video opens in the Blitz editor (it is not made yet, so it can still change). */
type Props = { item: BlitzScheduleDto; onClose: () => void; onChanged: () => void; editHref?: string };

const TITLES: Record<BlitzScheduleStatus, string> = {
  planned: 'Approve video',
  scheduled: 'Video approved',
  rendering: 'Being made',
  sending: 'Posting',
  processing: 'Posting',
  posted: 'Posted',
  failed: 'Could not post',
  canceled: 'Removed',
};

const pill = 'inline-flex min-h-11 flex-none items-center gap-1.5 rounded-full border border-[var(--line,#e8e5e1)] px-4 text-[14px] font-semibold text-[var(--ink,#000)] transition hover:bg-neutral-50 active:scale-95 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800';

/** Closes the sheet on Escape. */
function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
}

/** A video already made: its cover (it plays on the platform once posted). */
function MadeCover({ item }: { item: BlitzScheduleDto }) {
  return (
    <span className="mx-auto block aspect-[9/16] w-[min(56vw,220px)] overflow-hidden rounded-[26px] bg-neutral-100 shadow-sm dark:bg-neutral-800">
      {item.coverUrl && <CoverMedia src={item.coverUrl} video={item.coverIsVideo} alt={item.title} />}
    </span>
  );
}

/** Title, day, and the ways to change it while it is not made yet (Edit, Change day). */
function Details({ item, editable, editHref, f }: { item: BlitzScheduleDto; editable: boolean; editHref?: string; f: VideoSheetActions }) {
  return (
    <div className="space-y-3">
      <div className="min-w-0">
        <p className="line-clamp-2 text-[14px] font-semibold text-[var(--ink,#000)] dark:text-neutral-100">{item.title}</p>
        <p className="text-[13px] text-[var(--mute,#7c7d82)]">{whenLabel(new Date(f.scheduledAt))}</p>
      </div>
      {editable && (
        <div className="flex flex-wrap gap-2">
          {editHref && <Link href={editHref} className={pill}><Pencil aria-hidden className="h-4 w-4" /> Edit</Link>}
          <ChangeDay scheduledAt={f.scheduledAt} busy={f.busy === 'move'} onMove={(at) => void f.move(at)} />
        </div>
      )}
      {item.status === 'posted' && item.postUrl && (
        <a href={item.postUrl} target="_blank" rel="noreferrer" className={pill}><ExternalLink aria-hidden className="h-4 w-4" /> See the post</a>
      )}
      {item.status === 'failed' && item.error && <p className="text-[13px] text-red-700 dark:text-red-300">{item.error}</p>}
    </div>
  );
}

/** Remove (planned, approved or failed) and Approve / Save (not made yet); Close for a video on its way or posted. */
function Footer({ item, editable, f, onClose }: { item: BlitzScheduleDto; editable: boolean; f: VideoSheetActions; onClose: () => void }) {
  const removable = editable || item.status === 'failed';
  return (
    <footer className="flex gap-2 border-t border-[var(--line,#e8e5e1)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-neutral-800">
      {removable && (
        <button type="button" onClick={() => void f.remove()} disabled={f.busy !== null} className="flex min-h-12 items-center justify-center gap-1.5 rounded-full border border-[var(--line,#e8e5e1)] px-5 text-[14px] font-semibold text-red-600 transition active:scale-95 disabled:opacity-40 dark:border-neutral-700 dark:text-red-400">
          {f.busy === 'remove' && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />} Remove
        </button>
      )}
      {editable ? (
        <button type="button" onClick={() => void f.approve()} disabled={f.busy !== null} className="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--ready,#1e8049)] px-4 text-[14px] font-semibold text-white shadow-sm transition active:scale-95 disabled:opacity-40">
          {f.busy === 'approve' && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
          {item.status === 'scheduled' ? 'Save' : 'Approve & post'}
        </button>
      ) : (
        <button type="button" onClick={onClose} className="flex min-h-12 flex-1 items-center justify-center rounded-full border border-[var(--line,#e8e5e1)] px-4 text-[14px] font-semibold text-[var(--ink,#000)] transition active:scale-95 dark:border-neutral-700 dark:text-neutral-100">
          Close
        </button>
      )}
    </footer>
  );
}

/**
 * One Blitz video, opened from the calendar or the Library. Not made yet (planned or approved): it plays as a deck card,
 * and the user approves it (where it posts and that platform's choices), edits it, moves it to another day, or removes
 * it (its credit comes back). Made, posting, posted or failed: its cover and status.
 */
export function VideoSheet(props: Props) {
  const { item, onClose, editHref } = props;
  const choices = usePostChoices();
  const f = useVideoSheet(props, choices);
  const editable = item.status === 'planned' || item.status === 'scheduled';
  useEscape(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={TITLES[item.status]} onClick={(e) => e.stopPropagation()} className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-2xl bg-[var(--paper,#fff)] shadow-xl sm:rounded-2xl dark:bg-neutral-950">
        <header className="flex items-center gap-3 border-b border-[var(--line,#e8e5e1)] p-4 dark:border-neutral-800">
          <h3 className="min-w-0 flex-1 text-[16px] font-bold text-[var(--ink,#000)] dark:text-neutral-100">{TITLES[item.status]}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-[var(--mute,#7c7d82)] transition hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X aria-hidden className="h-5 w-5" />
          </button>
        </header>
        <div className="space-y-4 overflow-y-auto p-4">
          {editable ? <VideoPreview id={item.id} title={item.title} /> : <MadeCover item={item} />}
          <Details item={item} editable={editable} editHref={editHref} f={f} />
          {editable && <PostChoicesForm choices={choices} />}
          {f.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{f.error}</p>}
        </div>
        <Footer item={item} editable={editable} f={f} onClose={onClose} />
      </div>
    </div>
  );
}
