'use client';

// Kept videos list of the SwipeDeck: one row per kept card with Edit, Preview and Generate → Download.

import { Download, Eye, Loader2, Pencil, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { DeckCardData } from './SwipeDeck';

/** Background render of a kept card, as the row shows it. */
export type KeptRenderView =
  /** `queuePosition`: place in the render queue (1 = next); absent while rendering. */
  | { state: 'working'; queuePosition?: number }
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

/** Generate → Rendering… → Download. Failed renders offer Generate again. */
function RenderButton({ card, view, onGenerate }: { card: DeckCardData; view?: KeptRenderView; onGenerate: (cardId: string) => void }) {
  const [saving, setSaving] = useState(false);
  if (view?.state === 'working') {
    return (
      <button type="button" disabled className={solid} aria-live="polite">
        <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
        {view.queuePosition ? `In queue · #${view.queuePosition}` : 'Rendering…'}
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

export function KeptItem({ card, actions }: { card: DeckCardData; actions: KeptActions }) {
  const posterShot = card.shots[0];
  const view = actions.renderFor?.(card);
  return (
    <div className="mb-2 rounded-2xl border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] p-2 dark:border-neutral-800 dark:bg-neutral-900">
      <button
        type="button"
        onClick={() => actions.onPreview(card.id)}
        className="flex w-full items-center gap-2.5 text-left"
        aria-label={`Preview: ${posterShot?.text ?? card.hookStyle}`}
      >
        <KeptThumb card={card} />
        <div className="min-w-0 flex-1">
          <b className="block truncate text-[13px] font-semibold leading-snug text-[var(--ink,#000)] dark:text-neutral-100">
            {posterShot?.text ?? card.hookStyle}
          </b>
          <span className="line-clamp-1 text-[12px] text-[var(--mute,#7c7d82)]">{card.lensValue}</span>
        </div>
      </button>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => actions.onEdit(card.id)} className={ghost}>
          <Pencil aria-hidden className="h-3.5 w-3.5" /> Edit
        </button>
        <button type="button" onClick={() => actions.onPreview(card.id)} className={ghost}>
          <Eye aria-hidden className="h-3.5 w-3.5" /> Preview
        </button>
        {actions.onGenerate && <RenderButton card={card} view={view} onGenerate={actions.onGenerate} />}
      </div>
      {view?.state === 'failed' && (
        <p role="alert" className="mt-1.5 text-[11.5px] leading-snug text-red-600 dark:text-red-400">{view.error}</p>
      )}
    </div>
  );
}
