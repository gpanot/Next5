'use client';

// Presentational pieces of the SwipeDeck: end-of-deck screen and controls. Kept rows live in KeptList.

import { Check, Pencil, X } from 'lucide-react';
import type { DeckCardData, DeckLens } from './SwipeDeck';

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


// ── Controls (skip / edit / keep, undo, shortcuts) ───────────────────────────

export function DeckControls({
  disabled,
  canUndo,
  onSkip,
  onEdit,
  onKeep,
  onUndo,
}: {
  disabled: boolean;
  canUndo: boolean;
  onSkip: () => void;
  onEdit: () => void;
  onKeep: () => void;
  onUndo: () => void;
}) {
  return (
    <>
      {/* ── Controls ─────────────────────────────────────────────────── */}
      <div className="mt-9 flex items-center justify-center gap-3.5">
        {/* Skip */}
        <button
          type="button"
          disabled={disabled}
          onClick={onSkip}
          aria-label="Skip this video"
          className="grid h-[68px] w-[68px] place-items-center rounded-full border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] text-[#555] shadow-[0_8px_18px_-12px_rgba(0,0,0,.35)] active:scale-[.94] disabled:opacity-35"
        >
          <X aria-hidden className="h-7 w-7" strokeWidth={2.6} strokeLinecap="round" />
        </button>

        {/* Edit */}
        <button
          type="button"
          disabled={disabled}
          onClick={onEdit}
          aria-label="Edit this video"
          className="grid h-[50px] w-[50px] place-items-center rounded-full border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] text-[var(--ink,#000)] shadow-[0_8px_18px_-12px_rgba(0,0,0,.35)] active:scale-[.94] disabled:opacity-35"
        >
          <Pencil aria-hidden className="h-[21px] w-[21px]" strokeWidth={2.2} />
        </button>

        {/* Keep */}
        <button
          type="button"
          disabled={disabled}
          onClick={onKeep}
          aria-label="Keep this video"
          className="grid h-[68px] w-[68px] place-items-center rounded-full border border-[var(--ready,#1e8049)] bg-[var(--ready,#1e8049)] text-white shadow-[0_8px_18px_-12px_rgba(0,0,0,.35)] active:scale-[.94] disabled:opacity-35"
        >
          <Check aria-hidden className="h-[30px] w-[30px]" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
        </button>
      </div>

      {/* Control labels */}
      <div className="mt-1.5 flex justify-center gap-3.5" aria-hidden>
        <span className="w-[68px] text-center text-[12px] text-[var(--mute,#7c7d82)]">Skip</span>
        <span className="w-[50px] text-center text-[12px] text-[var(--mute,#7c7d82)]">Edit</span>
        <span className="w-[68px] text-center text-[12px] text-[var(--mute,#7c7d82)]">Keep</span>
      </div>

      {/* Undo + keyboard hint */}
      <div className="mt-2.5 flex items-center justify-center gap-[18px] text-[13px] text-[var(--mute,#7c7d82)]">
        <button
          type="button"
          disabled={!canUndo}
          onClick={onUndo}
          className="bg-none border-0 cursor-pointer text-[var(--ink,#000)] text-[13.5px] font-semibold underline underline-offset-[3px] disabled:cursor-default disabled:text-[var(--mute,#7c7d82)] disabled:no-underline"
        >
          Undo
        </button>
        <span className="hidden text-[12px] md:inline">
          <kbd className="rounded-[5px] border border-b-2 border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] px-[5px] text-[11.5px] text-[var(--ink,#000)]">←</kbd>
          {' '}skip{' '}
          <kbd className="rounded-[5px] border border-b-2 border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] px-[5px] text-[11.5px] text-[var(--ink,#000)]">→</kbd>
          {' '}keep{' '}
          <kbd className="rounded-[5px] border border-b-2 border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] px-[5px] text-[11.5px] text-[var(--ink,#000)]">E</kbd>
          {' '}edit{' '}
          <kbd className="rounded-[5px] border border-b-2 border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] px-[5px] text-[11.5px] text-[var(--ink,#000)]">Space</kbd>
          {' '}pause
        </span>
      </div>
    </>
  );
}
