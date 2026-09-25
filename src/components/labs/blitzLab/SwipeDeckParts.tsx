'use client';

// Presentational pieces of the SwipeDeck: kept-list row and the end-of-deck screen.

import { ArrowLeft, Check, Volume2, VolumeX } from 'lucide-react';
import type { DeckCardData, DeckLens } from './SwipeDeck';

// ── Kept thumbnail item ───────────────────────────────────────────────────────

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

export function KeptItem({ card, onEdit }: { card: DeckCardData; onEdit: (cardId: string) => void }) {
  const posterShot = card.shots[0];
  const isGenerated = card.status === 'generated';
  return (
    <div className="mb-2 flex items-center gap-2.5 rounded-2xl border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] p-2">
      <KeptThumb card={card} />
      <div className="min-w-0 flex-1">
        <b className="block truncate text-[13px] font-semibold leading-snug text-[var(--ink,#000)]">
          {posterShot?.text ?? card.hookStyle}
        </b>
        <span className="text-[12px] text-[var(--mute,#7c7d82)]">{card.lensValue}</span>
      </div>
      {isGenerated ? (
        <span className="ml-auto flex-none rounded-full bg-[var(--ready-bg,#e4f3ea)] px-2.5 py-0.5 text-[11.5px] font-semibold text-[var(--ready,#1e8049)]">
          Generated
        </span>
      ) : (
        <button
          type="button"
          onClick={() => onEdit(card.id)}
          className="ml-auto flex-none rounded-full bg-[var(--ink,#000)] px-3 py-1 text-[11.5px] font-semibold text-white transition-opacity hover:opacity-80"
        >
          Edit
        </button>
      )}
    </div>
  );
}

// ── Done (end) screen ─────────────────────────────────────────────────────────

export function DoneScreen({
  cards,
  lenses,
  filter,
  onShowAll,
  onMakeMore,
  onEdit,
}: {
  cards: DeckCardData[];
  lenses: DeckLens[];
  filter: string;
  onShowAll: () => void;
  onMakeMore?: () => void;
  onEdit: (cardId: string) => void;
}) {
  const kept = cards.filter((c) => c.status === 'kept' || c.status === 'generated');
  const hasOtherNew = filter !== 'all' && cards.some((c) => c.status === 'new');

  if (hasOtherNew) {
    const lens = lenses.find((l) => l.id === filter);
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[26px] border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] p-7 text-center">
        <h2 className="text-[25px] font-bold leading-snug text-[var(--ink,#000)]">
          That&rsquo;s all for {lens?.label ?? filter}
        </h2>
        <p className="mx-auto mt-2 mb-4 max-w-[24em] text-[var(--body,#4a4b50)]">
          Other audiences still have videos waiting.
        </p>
        <button
          type="button"
          onClick={onShowAll}
          className="inline-flex h-10 items-center rounded-full bg-[var(--ink,#000)] px-5 text-[14px] font-semibold text-[var(--btn-ink,#fff)]"
        >
          Show all
        </button>
      </div>
    );
  }

  // Count kept per lens
  const byLens: Record<string, number> = {};
  const byStyle: Record<string, number> = {};
  kept.forEach((c) => {
    byLens[c.lensValue] = (byLens[c.lensValue] ?? 0) + 1;
    byStyle[c.hookStyle] = (byStyle[c.hookStyle] ?? 0) + 1;
  });
  const topStyle = Object.keys(byStyle).sort((a, b) => (byStyle[b] ?? 0) - (byStyle[a] ?? 0))[0];

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[26px] border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] p-7 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[var(--ready-bg,#e4f3ea)] text-[var(--ready,#1e8049)]">
        <Check aria-hidden className="h-8 w-8 stroke-[2.8]" />
      </div>
      <h2 className="text-[25px] font-bold leading-snug text-[var(--ink,#000)]">
        {kept.length
          ? `You kept ${kept.length} video${kept.length > 1 ? 's' : ''}`
          : 'Nothing kept yet'}
      </h2>
      <p className="mx-auto mt-2.5 mb-4 max-w-[24em] text-[var(--body,#4a4b50)]">
        {kept.length
          ? <>Pick one and tap <b>Edit</b> to build the slideshow.{topStyle ? ` Your top hook style: ${topStyle}.` : ''}</>
          : 'We can make a new batch with different hooks.'}
      </p>

      {/* Stats table */}
      <div className="mb-5 grid w-full max-w-[260px] gap-1.5 text-left">
        {lenses.map((lens) => (
          <div
            key={lens.id}
            className="flex justify-between border-b border-[var(--line,#e8e5e1)] py-1.5 text-[14px]"
          >
            <span className="text-[var(--body,#4a4b50)]">{lens.label}</span>
            <b className="font-semibold text-[var(--ink,#000)]">{byLens[lens.label] ?? 0} kept</b>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onMakeMore}
        className="inline-flex h-10 items-center rounded-full bg-[var(--ink,#000)] px-5 text-[14px] font-semibold text-[var(--btn-ink,#fff)]"
      >
        Make another batch
      </button>
    </div>
  );
}


// ── App bar ───────────────────────────────────────────────────────────────────

export function DeckAppBar({
  onBack,
  subLabel,
  showSourceToggle,
  lenses,
  keptCount,
  soundOn,
  onToggleSound,
}: {
  onBack?: () => void;
  subLabel?: string;
  showSourceToggle: boolean;
  lenses: DeckLens[];
  keptCount: number;
  soundOn: boolean;
  onToggleSound: () => void;
}) {
  return (
  <header className="sticky top-[env(safe-area-inset-top,0px)] z-10 bg-[color-mix(in_srgb,var(--page,#f7f6f4)_90%,transparent)] backdrop-blur-[10px]">
    <div className="mx-auto flex max-w-[960px] items-center gap-3.5 px-5 pb-2.5 pt-3.5">
      {onBack && (
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          className="grid h-[38px] w-[38px] flex-none place-items-center rounded-full border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] text-[var(--ink,#000)]"
        >
          <ArrowLeft aria-hidden className="h-[18px] w-[18px]" strokeWidth={2.4} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-[19px] font-bold leading-snug tracking-[-0.025em] text-[var(--ink,#000)]">
          Your videos
        </h1>
        {subLabel && (
          <div className="text-[13px] text-[var(--mute,#7c7d82)] sm:block hidden">{subLabel}</div>
        )}
      </div>

      {showSourceToggle && (
        <div
          role="group"
          aria-label="Source"
          className="inline-flex flex-none rounded-full bg-[var(--soft-2,#e6e1db)] p-[3px]"
        >
          {(['website', 'zillow'] as const).map((src) => (
            <button
              key={src}
              type="button"
              className="rounded-full px-3 py-1.5 text-[13px] font-semibold capitalize text-[var(--body,#4a4b50)] aria-pressed:bg-[var(--paper,#fff)] aria-pressed:text-[var(--ink,#000)] aria-pressed:shadow-sm"
              aria-pressed={lenses[0]?.engine === src}
            >
              {src.charAt(0).toUpperCase() + src.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Sound: clip audio + music, for the whole deck (default on) */}
      <button
        type="button"
        onClick={onToggleSound}
        aria-pressed={soundOn}
        aria-label={soundOn ? 'Mute sound' : 'Turn sound on'}
        title={soundOn ? 'Sound on (M)' : 'Sound off (M)'}
        className="grid h-[38px] w-[38px] flex-none place-items-center rounded-full border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] text-[var(--ink,#000)] transition-colors hover:bg-[var(--soft-2,#e6e1db)]"
      >
        {soundOn
          ? <Volume2 aria-hidden className="h-[18px] w-[18px]" strokeWidth={2.2} />
          : <VolumeX aria-hidden className="h-[18px] w-[18px]" strokeWidth={2.2} />}
      </button>

      {/* Mobile: kept pill */}
      <button
        type="button"
        className="inline-flex h-[34px] flex-none items-center gap-1.5 rounded-full border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] px-3 text-[13px] font-semibold text-[var(--ink,#000)] sm:hidden"
        onClick={() => {/* open kept sheet on mobile */}}
        aria-label={`Kept: ${keptCount}`}
      >
        Kept <b>{keptCount}</b>
      </button>
    </div>
  </header>
  );
}
