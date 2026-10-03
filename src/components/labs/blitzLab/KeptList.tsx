'use client';

// Kept videos list of the SwipeDeck: one card per kept video. Tapping the card previews it; Edit, Add to calendar and
// Generate → Download sit below.

import { CalendarCheck, CalendarPlus, Download, Loader2, Pencil, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDeckSchedule } from './schedule/DeckSchedule';
import { whenLabel } from './schedule/slots';
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

/** "Add to calendar", or the post's day once it is on the calendar (tap to move or remove it). Workspace decks only. */
function CalendarButton({ card }: { card: DeckCardData }) {
  const schedule = useDeckSchedule();
  if (!schedule) return null;
  const item = schedule.itemFor(card.id);
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

/** One kept video. The whole card previews it; the buttons below keep their own action. */
export function KeptItem({ card, actions }: { card: DeckCardData; actions: KeptActions }) {
  const posterShot = card.shots[0];
  const view = actions.renderFor?.(card);
  const title = posterShot?.text ?? card.hookStyle;
  return (
    <div
      onClick={() => actions.onPreview(card.id)}
      className="mb-2 cursor-pointer rounded-2xl border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] p-2 transition hover:border-neutral-400 hover:shadow-sm active:scale-[0.99] dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
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
        <button type="button" onClick={() => actions.onEdit(card.id)} className={ghost}>
          <Pencil aria-hidden className="h-3.5 w-3.5" /> Edit
        </button>
        <CalendarButton card={card} />
        {actions.onGenerate && <RenderButton card={card} view={view} onGenerate={actions.onGenerate} />}
      </div>
      {view?.state === 'failed' && (
        <p role="alert" className="mt-1.5 text-[11.5px] leading-snug text-red-600 dark:text-red-400">{view.error}</p>
      )}
    </div>
  );
}
