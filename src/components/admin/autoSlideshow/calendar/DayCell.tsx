'use client';

import { PlatformIcon } from '../../../marketing/offer/PlatformMarks';
import type { AutoPostDto, AutoPostStatus } from '../../../../types/admin/autoSlideshow';
import { compact } from '../posting/PostStats';
import { MAX_PER_DAY } from './usePostTime';
import type { PlanDay, PlanSlot } from './weekPlan';

type Props = {
  day: PlanDay;
  /** Posts a day, set for the whole week from any empty day's stepper. */
  perDay: number;
  onPerDay: (n: number) => void;
  /** How many "Add" on this day makes: its empty slots plus earlier empty ones, so they land up to this day. */
  addCount: number;
  /** Undefined while the run is busy. */
  onAdd?: (count: number) => void;
  adding: boolean;
  onOpen: (slideshowId: string) => void;
};

const POST_BADGE: Record<AutoPostStatus, { label: string; tone: string }> = {
  scheduled: { label: 'Scheduled', tone: 'bg-blue-600 text-white' },
  sending: { label: 'Sending', tone: 'bg-blue-600 text-white' },
  processing: { label: 'Publishing', tone: 'bg-amber-500 text-white' },
  posted: { label: 'Posted', tone: 'bg-emerald-600 text-white' },
  failed: { label: 'Failed', tone: 'bg-red-600 text-white' },
  canceled: { label: 'Canceled', tone: 'bg-zinc-600 text-white' },
};

const frame = 'relative block aspect-[4/5] w-full overflow-hidden rounded-xl';
const timeOf = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

const LIVE: AutoPostStatus[] = ['scheduled', 'sending', 'processing', 'posted'];

/** Top-left: the platforms it goes to, and its views once posted (all platforms added up). */
function PostMarks({ posts }: { posts: AutoPostDto[] }) {
  const live = posts.filter((p) => LIVE.includes(p.status));
  if (live.length === 0) return null;
  const views = live.reduce((n, p) => n + (p.stats?.views ?? 0), 0);
  return (
    <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold text-white">
      {live.map((p) => <PlatformIcon key={p.platform} id={p.platform} className="h-2.5 w-2.5" />)}
      {views > 0 && <span className="tabular-nums">{compact(views)} views</span>}
    </span>
  );
}

function Cover({ url, alt, badge, tone, time, posts = [], onOpen }: { url: string | null; alt: string; badge: string; tone: string; time: string; posts?: AutoPostDto[]; onOpen: () => void }) {
  return (
    <button onClick={onOpen} aria-label={`${alt} · ${badge} · ${time}`} className={`${frame} group bg-zinc-100 shadow-sm transition active:scale-[0.97] dark:bg-zinc-800`}>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
      )}
      <PostMarks posts={posts} />
      <span className={`absolute inset-x-1.5 bottom-1.5 truncate rounded-full px-2 py-0.5 text-center text-[10px] font-bold ${tone}`}>{badge}</span>
    </button>
  );
}

const round = 'flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-white text-lg font-semibold text-blue-600 transition active:scale-90 disabled:opacity-30 dark:border-blue-900 dark:bg-zinc-900 dark:text-blue-400';

/** Empty day: "− N +" sets posts a day for the whole week (times pick themselves), "Add" makes them. */
function AddBox({ day, perDay, onPerDay, addCount, onAdd, adding, compact }: Omit<Props, 'onOpen'> & { compact: boolean }) {
  const empty = day.slots.filter((s) => s.item === null).length;
  return (
    <div className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-2 dark:border-blue-900 dark:bg-blue-950/20 ${compact ? 'py-3' : 'aspect-[4/5]'}`}>
      <div className="flex items-center gap-2" role="group" aria-label="Posts a day">
        <button onClick={() => onPerDay(perDay - 1)} disabled={perDay <= 1} aria-label="One less post a day" className={round}>−</button>
        <span className="w-5 text-center text-lg font-extrabold text-ink tabular-nums dark:text-zinc-100" aria-live="polite">{perDay}</span>
        <button onClick={() => onPerDay(perDay + 1)} disabled={perDay >= MAX_PER_DAY} aria-label="One more post a day" className={round}>+</button>
      </div>
      <span className="text-[10px] text-muted">{perDay === 1 ? 'post' : 'posts'} a day</span>
      <button
        onClick={() => onAdd?.(addCount)}
        disabled={!onAdd || adding || addCount === 0}
        className="min-h-9 w-full rounded-full bg-blue-600 px-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-40 dark:bg-blue-500"
      >
        {adding ? '…' : addCount > empty ? `Add ${addCount}` : 'Add'}
      </button>
    </div>
  );
}

function Slot({ slot, onOpen }: { slot: PlanSlot; onOpen: (slideshowId: string) => void }) {
  const { item } = slot;
  const time = timeOf(slot.at);
  if (item?.kind === 'post') {
    const badge = POST_BADGE[item.post.status];
    return <Cover url={item.show.slides[0]?.imageUrl ?? null} alt={item.show.topic} badge={badge.label} tone={badge.tone} time={time} posts={item.show.posts} onOpen={() => onOpen(item.show.id)} />;
  }
  if (item?.kind === 'ready') {
    return <Cover url={item.show.slides[0]?.imageUrl ?? null} alt={item.show.topic} badge="Approve" tone="bg-white/90 text-ink" time={time} onOpen={() => onOpen(item.show.id)} />;
  }
  return (
    <div className={`${frame} flex animate-pulse flex-col items-center justify-center gap-2 bg-zinc-100 p-2 text-center dark:bg-zinc-800`}>
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-500" />
      <span className="text-[10px] font-semibold text-muted">Making…</span>
    </div>
  );
}

/** One calendar day (its post time is in the options line and each cover's label, not on the cover): its date, its filled slots (post, ready, being made), then one add box for any empty slots. */
export function DayCell(props: Props) {
  const { day, onOpen } = props;
  const filled = day.slots.filter((s) => s.item !== null);
  const hasEmpty = !day.past && filled.length < day.slots.length;
  return (
    <div className={`w-[30%] shrink-0 snap-start sm:w-[22%] md:w-auto ${day.past ? 'opacity-60' : ''}`}>
      <p className="mb-1.5 flex items-baseline justify-between gap-1 px-0.5">
        <span className="text-[11px] font-bold text-ink uppercase dark:text-zinc-100">{day.date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
        <span className="text-[11px] text-muted">{day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
      </p>
      <div className="flex flex-col gap-2">
        {day.slots.length === 0 && <div className={`${frame} border border-dashed border-line dark:border-zinc-800`} />}
        {filled.map((slot, i) => <Slot key={`${i}-${slot.at.toISOString()}`} slot={slot} onOpen={onOpen} />)}
        {hasEmpty && <AddBox {...props} compact={filled.length > 0} />}
      </div>
    </div>
  );
}
