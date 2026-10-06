'use client';

// Kept videos of the SwipeDeck: one card per kept video. In the Kept videos tab, tapping the card previews it; Edit and
// Add to calendar sit below. In the Library tab the same card carries Generate → Download and Post now.

import { CalendarCheck, CalendarPlus, Download, Loader2, Pencil, Send, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDeckSchedule } from './schedule/DeckSchedule';
import { whenLabel } from '../addToCalendar/slots';
import type { BlitzScheduleDto } from '../../../types/admin/blitzSchedule';
import type { DeckCardData } from './SwipeDeck';

/** Background render of a kept card, as the row shows it. */
export type KeptRenderView =
  /** `queuePosition`: place in the render queue (1 = next); absent while rendering. `startedAt`: when the worker
   *  started rendering (ms), for the countdown; absent until the worker reports it. */
  | { state: 'working'; queuePosition?: number; startedAt?: number }
  | { state: 'ready'; videoUrl: string; projectId: string }
  | { state: 'failed'; error: string };

export type KeptActions = {
  onEdit: (cardId: string) => void;
  onPreview: (cardId: string) => void;
  /** Absent = the deck cannot render on its own (Generate hidden). */
  onGenerate?: (cardId: string) => void;
  renderFor?: (card: DeckCardData) => KeptRenderView | undefined;
};

/**
 * Saves the MP4. A cross-origin link ignores `download`, so fetch it as a blob first;
 * when CORS blocks that, open the file in a new tab instead.
 */
async function saveVideo(url: string, name: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const href = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}

/**
 * Poster for a kept card: the hook shot's clip (first frame at its best moment) or photo.
 * CSS background-image cannot show a video, which left clip-led cards blank.
 */
function KeptThumb({ card }: { card: DeckCardData }) {
  const shot = card.shots[0];
  const box = 'h-[50px] w-[34px] flex-none overflow-hidden rounded-[7px] bg-neutral-800';
  if (shot?.mediaUrl && shot.mediaKind === 'video') {
    return (
      <div className={box} aria-hidden>
        <video src={shot.mediaUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
      </div>
    );
  }
  if (shot?.mediaUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={shot.mediaUrl} alt="" aria-hidden className={`${box} object-cover`} />
    );
  }
  return (
    <div
      className={box}
      style={{ background: `linear-gradient(160deg,hsl(${card.hue ?? 220} 32% 38%),hsl(${((card.hue ?? 220) + 24) % 360} 38% 21%))` }}
      aria-hidden
    />
  );
}

const pill = 'inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-semibold transition-opacity hover:opacity-80 disabled:cursor-default disabled:opacity-60';
const ghost = `${pill} border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] text-[var(--ink,#000)] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100`;
const solid = `${pill} bg-[var(--ink,#000)] text-white dark:bg-white dark:text-black`;

/** What a render usually takes. The countdown sets the expectation that videos are slow, not a hard limit. */
const RENDER_ESTIMATE_MS = 5 * 60_000;

const clock = (ms: number) => {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** "Rendering… 4:12", counting down from 5:00 since the render started (or since this row first showed it). */
function RenderCountdown({ startedAt }: { startedAt?: number }) {
  const [shownAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = RENDER_ESTIMATE_MS - (now - (startedAt ?? shownAt));
  return <span className="tabular-nums">{left > 0 ? `Rendering… ${clock(left)}` : 'Almost done…'}</span>;
}

/** Generate → Rendering… 5:00 → Download. Failed renders offer Generate again. */
function RenderButton({ card, view, onGenerate }: { card: DeckCardData; view?: KeptRenderView; onGenerate: (cardId: string) => void }) {
  const [saving, setSaving] = useState(false);
  if (view?.state === 'working') {
    return (
      <button type="button" disabled className={solid} aria-label={view.queuePosition ? `In queue, number ${view.queuePosition}` : 'Rendering, takes about 5 minutes'}>
        <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
        {view.queuePosition ? `In queue · #${view.queuePosition}` : <RenderCountdown startedAt={view.startedAt} />}
      </button>
    );
  }
  if (view?.state === 'ready') {
    const download = async () => {
      setSaving(true);
      await saveVideo(view.videoUrl, `slideshow-${view.projectId}.mp4`);
      setSaving(false);
    };
    return (
      <button type="button" onClick={() => void download()} disabled={saving} className={`${pill} bg-[var(--ready,#1e8049)] text-white`}>
        {saving ? <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> : <Download aria-hidden className="h-3.5 w-3.5" />}
        Download
      </button>
    );
  }
  return (
    <button type="button" onClick={() => onGenerate(card.id)} className={solid}>
      <Sparkles aria-hidden className="h-3.5 w-3.5" /> Generate
    </button>
  );
}

const PLATFORM = { tiktok: 'TikTok', youtube: 'YouTube' } as const;

/** What is happening to a video that is being made or posted, as a short line; null when it is just on the calendar. */
const progressOf = (item: BlitzScheduleDto): string | null => {
  const where = PLATFORM[item.platform];
  if (item.status === 'rendering') return 'Making your video…';
  if (item.status === 'sending' || item.status === 'processing') return `Posting to ${where}…`;
  if (item.status === 'scheduled' && new Date(item.scheduledAt).getTime() <= Date.now()) return 'Starting…';
  return null;
};

/** Live status of a post made now: progress while it works, a link once posted, the reason when it failed. */
function PostProgress({ item }: { item: BlitzScheduleDto }) {
  const text = progressOf(item);
  if (text) return <span role="status" className={`${ghost} cursor-default`}><Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />{text}</span>;
  if (item.status === 'posted') {
    const body = <><CalendarCheck aria-hidden className="h-3.5 w-3.5" />Posted to {PLATFORM[item.platform]}</>;
    const done = `${ghost} border-[var(--ready,#1e8049)] text-[var(--ready,#1e8049)] dark:border-emerald-700 dark:text-emerald-400`;
    return item.postUrl ? <a href={item.postUrl} target="_blank" rel="noreferrer" className={done}>{body} ↗</a> : <span className={done}>{body}</span>;
  }
  return <span role="alert" className={`${ghost} border-red-300 text-red-600 dark:border-red-900 dark:text-red-400`}>Failed to post</span>;
}

/** "Add to calendar", or the post's day once it is on the calendar (tap to move or remove it). Workspace decks only. */
function CalendarButton({ card }: { card: DeckCardData }) {
  const schedule = useDeckSchedule();
  if (!schedule) return null;
  const item = schedule.itemFor(card.id) ?? schedule.failedFor(card.id);
  if (item && (progressOf(item) || item.status === 'posted' || item.status === 'failed')) return <PostProgress item={item} />;
  if (!item) {
    return (
      <button type="button" onClick={() => schedule.open(card)} className={ghost}>
        <CalendarPlus aria-hidden className="h-3.5 w-3.5" /> Add to calendar
      </button>
    );
  }
  const posted = item.status === 'posted';
  return (
    <button type="button" onClick={() => schedule.open(card)} className={`${ghost} border-[var(--ready,#1e8049)] text-[var(--ready,#1e8049)] dark:border-emerald-700 dark:text-emerald-400`} aria-label={`${posted ? 'Posted' : 'Scheduled'} ${whenLabel(new Date(item.scheduledAt))}. Change`}>
      <CalendarCheck aria-hidden className="h-3.5 w-3.5" />
      {posted ? 'Posted' : new Date(item.scheduledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
    </button>
  );
}

/** "Post now": made and posted at once. Hidden once the video is being made or posted. Workspace decks only. */
function PostNowButton({ card }: { card: DeckCardData }) {
  const schedule = useDeckSchedule();
  if (!schedule) return null;
  const item = schedule.itemFor(card.id);
  if (item && item.status !== 'planned' && item.status !== 'scheduled') return null;
  if (item && progressOf(item)) return null;
  return (
    <button type="button" onClick={() => schedule.openPostNow(card)} className={ghost}>
      <Send aria-hidden className="h-3.5 w-3.5" /> Post now
    </button>
  );
}

/** Why the last post of this video failed, under its buttons. */
function PostFailure({ card }: { card: DeckCardData }) {
  const failed = useDeckSchedule()?.failedFor(card.id);
  if (!failed?.error) return null;
  return <p role="alert" className="mt-1.5 text-[11.5px] leading-snug text-red-600 dark:text-red-400">{failed.error}</p>;
}

/** Progress, posted or failed chip of a card's post; nothing while it is only on the calendar. */
function PostStatus({ card }: { card: DeckCardData }) {
  const schedule = useDeckSchedule();
  const item = schedule?.itemFor(card.id) ?? schedule?.failedFor(card.id);
  return item && (progressOf(item) || item.status === 'posted' || item.status === 'failed') ? <PostProgress item={item} /> : null;
}

/**
 * One kept video. `kept` (the Kept videos tab): the card previews it; Edit and the calendar below. `library` (the
 * Library tab): what makes it, Generate → Download and Post now, with the post's status. The buttons keep their own
 * action: a tap on them never previews.
 */
export function KeptItem({ card, actions, mode = 'kept' }: { card: DeckCardData; actions: KeptActions; mode?: 'kept' | 'library' }) {
  const posterShot = card.shots[0];
  const view = actions.renderFor?.(card);
  const title = posterShot?.text ?? card.hookStyle;
  return (
    <div
      onClick={mode === 'kept' ? () => actions.onPreview(card.id) : undefined}
      className={`${mode === 'kept' ? 'cursor-pointer active:scale-[0.99]' : ''} rounded-2xl border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] p-2 transition hover:border-neutral-400 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600`}
    >
      <button type="button" className="flex w-full items-center gap-2.5 text-left" aria-label={`Preview: ${title}`}>
        <KeptThumb card={card} />
        <div className="min-w-0 flex-1">
          <b className="block truncate text-[13px] font-semibold leading-snug text-[var(--ink,#000)] dark:text-neutral-100">{title}</b>
          <span className="line-clamp-1 text-[12px] text-[var(--mute,#7c7d82)]">{card.lensValue}</span>
        </div>
      </button>
      {/* The buttons keep their own action: a tap on them never previews. */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {mode === 'kept' ? (
          <>
            <button type="button" onClick={() => actions.onEdit(card.id)} className={ghost}>
              <Pencil aria-hidden className="h-3.5 w-3.5" /> Edit
            </button>
            <CalendarButton card={card} />
          </>
        ) : (
          <>
            {actions.onGenerate && <RenderButton card={card} view={view} onGenerate={actions.onGenerate} />}
            <PostNowButton card={card} />
            <PostStatus card={card} />
          </>
        )}
      </div>
      <PostFailure card={card} />
      {view?.state === 'failed' && (
        <p role="alert" className="mt-1.5 text-[11.5px] leading-snug text-red-600 dark:text-red-400">{view.error}</p>
      )}
    </div>
  );
}
