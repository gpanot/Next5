'use client';

import { Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { BlitzScheduleDto, TikTokChoices } from '../../../../types/admin/blitzSchedule';
import { errorOf } from '../../labClient';
import { useLabClient } from '../../LabClientProvider';
import { CoverMedia } from '../../addToCalendar/CoverMedia';
import { ConnectTikTok } from './ConnectTikTok';
import { scheduleApi } from './scheduleApi';
import { whenLabel } from '../../addToCalendar/slots';
import { choicesReady, TikTokFields, useTikTokCreator } from './TikTokFields';

type Props = { item: BlitzScheduleDto; onClose: () => void; onChanged: () => void };

const NO_CHOICES: TikTokChoices = { privacyLevel: '', allowComments: true, brandOrganic: false, brandContent: false, consent: false };

/** The TikTok part: loading, not connected (connect right here), or the choices. */
function TikTokPart({ choices, setChoices, disclose, setDisclose }: { choices: TikTokChoices; setChoices: (c: TikTokChoices) => void; disclose: boolean; setDisclose: (v: boolean) => void }) {
  const creator = useTikTokCreator();
  if (creator.status === 'loading') return <div className="h-32 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" aria-label="Loading your TikTok account" />;
  if (creator.status === 'error') {
    if (creator.notConnected) return <ConnectTikTok />;
    return <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">{creator.message}</p>;
  }
  return <TikTokFields creator={creator.creator} value={choices} onChange={setChoices} disclose={disclose} onDisclose={setDisclose} />;
}

/** Approve, or remove, one video; resolves the error text or null. */
function useApprove({ item, onClose, onChanged }: Props) {
  const client = useLabClient();
  const [choices, setChoices] = useState<TikTokChoices>(NO_CHOICES);
  const [disclose, setDisclose] = useState(false);
  const [busy, setBusy] = useState<'approve' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async (how: 'approve' | 'remove') => {
    setBusy(how);
    setError(null);
    const tiktok = { ...choices, brandOrganic: disclose && choices.brandOrganic, brandContent: disclose && choices.brandContent };
    const res = await (how === 'approve' ? scheduleApi.approve(client, item.id, { tiktok }) : scheduleApi.cancel(client, item.id)).catch(() => null);
    setBusy(null);
    if (!res?.ok) return setError(res ? errorOf(res) : 'Could not reach the server. Check your connection.');
    onChanged();
    onClose();
  };
  return { choices, setChoices, disclose, setDisclose, busy, error, ready: busy === null && choicesReady(choices, disclose), run };
}

/**
 * A planned Blitz video on the calendar: the user approves it here with TikTok's choices (connecting TikTok first when
 * needed), like the slideshows. Also removes it (its credit comes back).
 */
export function ApproveVideoSheet(props: Props) {
  const { item, onClose } = props;
  const f = useApprove(props);
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
          <div className="flex items-center gap-3">
            <span className="h-20 w-16 flex-none overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
              {item.coverUrl && <CoverMedia src={item.coverUrl} video={item.coverIsVideo} />}
            </span>
            <div className="min-w-0">
              <p className="line-clamp-2 text-[14px] font-semibold text-[var(--ink,#000)] dark:text-neutral-100">{item.title}</p>
              <p className="text-[13px] text-[var(--mute,#7c7d82)]">{whenLabel(new Date(item.scheduledAt))}</p>
            </div>
          </div>
          <TikTokPart choices={f.choices} setChoices={f.setChoices} disclose={f.disclose} setDisclose={f.setDisclose} />
          {f.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{f.error}</p>}
        </div>
        <footer className="flex gap-2 border-t border-[var(--line,#e8e5e1)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-neutral-800">
          <button type="button" onClick={() => void f.run('remove')} disabled={f.busy !== null} className="flex min-h-12 items-center justify-center gap-1.5 rounded-full border border-[var(--line,#e8e5e1)] px-5 text-[14px] font-semibold text-red-600 transition active:scale-95 disabled:opacity-40 dark:border-neutral-700 dark:text-red-400">
            {f.busy === 'remove' && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />} Remove
          </button>
          <button type="button" onClick={() => void f.run('approve')} disabled={!f.ready} className="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--ready,#1e8049)] px-4 text-[14px] font-semibold text-white shadow-sm transition active:scale-95 disabled:opacity-40">
            {f.busy === 'approve' && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
            {item.status === 'scheduled' ? 'Save' : 'Approve & post'}
          </button>
        </footer>
      </div>
    </div>
  );
}
