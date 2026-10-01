'use client';

import { PlatformIcon } from '../../marketing/offer/PlatformMarks';
import { PLATFORM_LABELS, PRIVACY_LABELS, type AutoPostDto, type AutoPostStatus, type AutoSlideshowDto } from '../../../types/admin/autoSlideshow';
import { PostStatsLine } from './posting/PostStats';
import { formatWhen } from './schedule';

type Props = {
  posts: AutoPostDto[];
  slideshows: AutoSlideshowDto[];
  busy: string | null;
  onAction: (postId: string, action: 'now' | 'cancel' | 'refresh') => void;
};

const STATUS: Record<AutoPostStatus, { label: string; tone: string }> = {
  scheduled: { label: 'Scheduled', tone: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  sending: { label: 'Sending', tone: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  processing: { label: 'Publishing', tone: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  posted: { label: 'Posted', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  failed: { label: 'Failed', tone: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  canceled: { label: 'Canceled', tone: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
};

const action = 'min-h-10 rounded-full px-3 text-xs font-semibold transition active:scale-95 disabled:opacity-40';

/** The run's posts (TikTok and Instagram) in time order, with their numbers and what can be done to each. */
export function PostQueue({ posts, slideshows, busy, onAction }: Props) {
  if (posts.length === 0) return <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted dark:border-zinc-800">Nothing scheduled yet.</p>;
  const showOf = new Map(slideshows.map((s) => [s.id, s]));
  return (
    <ul className="space-y-2">
      {posts.map((p) => {
        const show = showOf.get(p.slideshowId);
        const s = STATUS[p.status];
        return (
          <li key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="h-16 w-13 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
              {show?.slides[0]?.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={show.slides[0].imageUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink dark:text-zinc-100">{show?.topic ?? 'Deleted slideshow'}</p>
              <p className="flex items-center gap-1 text-xs text-muted">
                <PlatformIcon id={p.platform} className="h-3 w-3" /> {PLATFORM_LABELS[p.platform]} · {p.status === 'posted' && p.postedAt ? `Posted ${formatWhen(p.postedAt)}` : formatWhen(p.scheduledAt)}
                {p.platform === 'tiktok' && ` · ${PRIVACY_LABELS[p.privacyLevel] ?? p.privacyLevel}`}
              </p>
              {p.status === 'posted' && <PostStatsLine stats={p.stats} className="mt-0.5 text-ink dark:text-zinc-100" />}
              {p.error && <p className="mt-1 line-clamp-2 text-xs text-red-600 dark:text-red-400">{p.error}</p>}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase ${s.tone}`}>{s.label}</span>
              <div className="flex gap-1">
                {(p.status === 'scheduled' || p.status === 'failed') && (
                  <button disabled={busy !== null} onClick={() => onAction(p.id, 'now')} className={`${action} text-blue-600 dark:text-blue-400`}>
                    {busy === `now-${p.id}` ? 'Sending…' : p.status === 'failed' ? 'Retry' : 'Send now'}
                  </button>
                )}
                {(p.status === 'scheduled' || p.status === 'failed') && (
                  <button disabled={busy !== null} onClick={() => onAction(p.id, 'cancel')} className={`${action} text-muted hover:text-red-600`}>Cancel</button>
                )}
                {p.status === 'processing' && (
                  <button disabled={busy !== null} onClick={() => onAction(p.id, 'refresh')} className={`${action} text-blue-600 dark:text-blue-400`}>
                    {busy === `refresh-${p.id}` ? 'Checking…' : 'Check'}
                  </button>
                )}
                {p.postUrl && <a href={p.postUrl} target="_blank" rel="noreferrer" className={`${action} flex items-center text-blue-600 dark:text-blue-400`}>View ↗</a>}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
