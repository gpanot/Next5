'use client';

/**
 * SwipeDeck — full deck orchestrator for the Blitz Slideshow.
 *
 * Faithfully implements the layout, state machine, and interactions from
 * next5-video-deck-v3.html.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────────────┐
 *   │ App bar: "Your videos" + source toggle + kept pill       │
 *   ├───────────────┬─────────────────────────────────────────┤
 *   │ Sidebar       │ Filter chips                             │
 *   │ (Kept list)   │ Head: [Audience] [Style] [Why this? ▾]  │
 *   │               │ ┌─────────────┐                         │
 *   │               │ │  Card stack │ (9:16, max 380px)       │
 *   │               │ │ (3 cards)   │                         │
 *   │               │ └─────────────┘                         │
 *   │               │ ✕  ✏️  ✓  controls                     │
 *   │               │ Undo · ←skip →keep E edit Space pause   │
 *   └───────────────┴─────────────────────────────────────────┘
 *
 * Reusable: accepts `DeckCardData[]` (engine-agnostic), renders everything else.
 */

import { Check, Pencil, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SwipeCard } from './SwipeCard';
import { DeckAppBar, DoneScreen, KeptItem } from './SwipeDeckParts';
import { useDeckSound } from './useDeckSound';
import type { CopyCheckContext } from './deckApi';
import type { SwipeCardTag, SwipeCardWhyPanel, ShotView } from './SwipeCard';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DeckCardStatus = 'new' | 'kept' | 'skipped' | 'edited' | 'generated';

/** One card in the deck. Engine-agnostic shape. */
export type DeckCardData = {
  id: string;
  /** Lens value: IDC name (website) or angle label (zillow). */
  lensValue: string;
  /** lensId for filtering. */
  lensId: string;
  /** Hook style label: "Call-out", "Curiosity", etc. */
  hookStyle: string;
  /** The 7 shots to display. */
  shots: ShotView[];
  /** Tags shown in the head row. Auto-built from lensValue + hookStyle if not provided. */
  tags?: SwipeCardTag[];
  /** "Why this?" panel data. */
  whyPanel?: SwipeCardWhyPanel;
  /** Fallback tint hue (0–360). */
  hue?: number;
  status: DeckCardStatus;
  /** True once the card has been rendered by the worker. */
  ready?: boolean;
  /** Skip reason recorded on discard. */
  reason?: string;
  /** True when the shots were edited by the user. */
  edited?: boolean;
  /** Saved card id (slideshow_variants). Absent = swipes on this card are not logged. */
  variantId?: string;
  /** Track the engine picked for this card (`url` plays in the deck). */
  audio?: { assetKey: string; url?: string; startAt: number; label: string } | null;
  /** What edited copy is checked against before render (listing facts or the brand profile). */
  check?: CopyCheckContext;
};

/** One entry in the undo history. */
type HistEntry = { id: string; from: DeckCardStatus };

/** Sub-label shown below the appbar title. */
export type DeckSubLabel = string;

/** Lens metadata for the source toggle and filter chips. */
export type DeckLens = {
  id: string;
  label: string;
  /** 'website' | 'zillow' — drives source toggle state. */
  engine?: 'website' | 'zillow';
};

export type SwipeDeckProps = {
  cards: DeckCardData[];
  lenses: DeckLens[];
  subLabel?: DeckSubLabel;
  /** Called when a card is kept (to trigger render). */
  onKeep?: (cardId: string) => void;
  /** Called when the user taps Edit on a card. */
  onEdit?: (cardId: string) => void;
  /** Called when a skip reason is recorded. */
  onSkipReason?: (cardId: string, reason: string) => void;
  /** Called when "Make another batch" is pressed. */
  onMakeMore?: () => void;
  /** Called whenever the cards array changes status (keep/skip/generate). Parent uses it to cache state. */
  onCardsChange?: (cards: DeckCardData[]) => void;
  /** Whether to show the source toggle (website / zillow). */
  showSourceToggle?: boolean;
  /** Pauses the top card and keyboard shortcuts, e.g. while the editor is open over the deck. */
  paused?: boolean;
  /** App-bar back button. Hidden when absent. */
  onBack?: () => void;
  /** Music for cards without their own track (e.g. the editor's default library track). */
  fallbackAudioUrl?: string;
  /** Every deck action, for logging: keep, discard (reason arrives in a second call), undo. */
  onSwipe?: (card: DeckCardData, action: 'keep' | 'discard' | 'undo', reason?: string) => void;
};

// ── Skip reason options ───────────────────────────────────────────────────────

const SKIP_REASONS = ['Weak hook', 'Wrong audience', 'Off brand', 'Bad visual', 'Wrong facts'];

// ── Toast ─────────────────────────────────────────────────────────────────────

type ToastState = {
  message: string;
  withUndo: boolean;
  skipReasonFor?: DeckCardData;
  pickedReason?: string;
} | null;

// ── Main SwipeDeck component ─────────────────────────────────────────────────

export function SwipeDeck({
  cards: initialCards,
  lenses,
  subLabel,
  onKeep,
  onEdit,
  onSkipReason,
  onMakeMore,
  onCardsChange,
  showSourceToggle = false,
  paused = false,
  onBack,
  onSwipe,
  fallbackAudioUrl,
}: SwipeDeckProps) {
  const [cards, setCards] = useState<DeckCardData[]>(initialCards);
  const [filter, setFilter] = useState<string>('all');
  const [history, setHistory] = useState<HistEntry[]>([]);
  const [toast, setToast] = useState<ToastState>(null);
  const [exitMap, setExitMap] = useState<Record<string, 'keep' | 'discard'>>({});
  const { soundOn, toggleSound } = useDeckSound();
  const audioRef = useRef<HTMLAudioElement>(null);

  // Sync incoming cards changes (e.g. edits saved by the parent editor)
  useEffect(() => { setCards(initialCards); }, [initialCards]);

  // Report every status change (keep, skip, undo, reason) so the parent owns the source of truth.
  // Re-reporting the array the parent just passed in is a no-op for its state setter.
  useEffect(() => { onCardsChange?.(cards); }, [cards]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived data ───────────────────────────────────────────────────────────
  const visible = cards.filter((c) => filter === 'all' || c.lensId === filter);
  const queue = visible.filter((c) => c.status === 'new');
  const keptCards = cards.filter((c) => c.status === 'kept' || c.status === 'generated');

  const lensCounts: Record<string, number> = {};
  cards.forEach((c) => {
    if (c.status === 'new') lensCounts[c.lensId] = (lensCounts[c.lensId] ?? 0) + 1;
  });
  const allNewCount = cards.filter((c) => c.status === 'new').length;

  const current = queue[0] ?? null;

  // ── Music for the top card ────────────────────────────────────────────────
  const trackUrl = current?.audio?.url ?? fallbackAudioUrl;
  const trackStart = current?.audio?.startAt ?? 0;
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (soundOn && !paused && trackUrl && current) audio.play().catch(() => undefined); // autoplay may be blocked until a tap
    else audio.pause();
  }, [soundOn, paused, trackUrl, current]);
  const next1 = queue[1] ?? null;
  const next2 = queue[2] ?? null;

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = useCallback((t: ToastState, ms = 3200) => {
    clearTimeout(toastTimer.current);
    setToast(t);
    if (ms > 0) toastTimer.current = setTimeout(() => setToast(null), ms);
  }, []);

  // ── Keep ───────────────────────────────────────────────────────────────────
  const handleKeep = useCallback(() => {
    if (!current) return;
    setHistory((h) => [...h, { id: current.id, from: 'new' }]);
    setExitMap((m) => ({ ...m, [current.id]: 'keep' }));
    setTimeout(() => {
      setCards((prev) => prev.map((c) => (c.id === current.id ? { ...c, status: 'kept' as DeckCardStatus } : c)));
      setExitMap((m) => { const n = { ...m }; delete n[current.id]; return n; });
    }, 320);
    onKeep?.(current.id);
    onSwipe?.(current, 'keep');
    showToast({ message: 'Kept. Tap Edit to finish and render it.', withUndo: true }, 3200);
  }, [current, onKeep, onSwipe, showToast]);

  // ── Skip ───────────────────────────────────────────────────────────────────
  const handleSkip = useCallback(() => {
    if (!current) return;
    setHistory((h) => [...h, { id: current.id, from: 'new' }]);
    setExitMap((m) => ({ ...m, [current.id]: 'discard' }));
    setTimeout(() => {
      setCards((prev) => prev.map((c) => (c.id === current.id ? { ...c, status: 'skipped' as DeckCardStatus } : c)));
      setExitMap((m) => { const n = { ...m }; delete n[current.id]; return n; });
    }, 320);
    onSwipe?.(current, 'discard');
    showToast({ message: 'Skipped. What was off?', withUndo: true, skipReasonFor: current }, 6000);
  }, [current, onSwipe, showToast]);

  // ── Undo ───────────────────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    const entry = history[history.length - 1];
    if (!entry) return;
    setHistory((h) => h.slice(0, -1));
    setCards((prevCards) => {
      const card = prevCards.find((c) => c.id === entry.id);
      if (!card) return prevCards;
      // Restore to previous status and move to front of queue
      const withoutCard = prevCards.filter((c) => c.id !== entry.id);
      const firstNewIdx = withoutCard.findIndex((c) => c.status === 'new');
      const insertAt = firstNewIdx >= 0 ? firstNewIdx : withoutCard.length;
      const restored: DeckCardData = { ...card, status: entry.from, ready: false, reason: undefined };
      return [...withoutCard.slice(0, insertAt), restored, ...withoutCard.slice(insertAt)];
    });
    const undone = cards.find((c) => c.id === entry.id);
    if (undone) onSwipe?.(undone, 'undo');
    setToast(null);
    if (filter !== 'all') setFilter('all');
  }, [history, cards, filter, onSwipe]);

  // ── Edit ───────────────────────────────────────────────────────────────────
  // The parent opens the full editor for this card; the deck stays mounted underneath.
  const handleEditOpen = useCallback(() => {
    if (current) onEdit?.(current.id);
  }, [current, onEdit]);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches('textarea, input')) return;
      if (paused) return;
      if (e.key === 'ArrowRight') handleKeep();
      else if (e.key === 'ArrowLeft') handleSkip();
      else if (e.key === 'z' || e.key === 'Z') handleUndo();
      else if (e.key === 'e' || e.key === 'E') { e.preventDefault(); handleEditOpen(); }
      else if (e.key === 'm' || e.key === 'M') toggleSound();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handleKeep, handleSkip, handleUndo, handleEditOpen, paused, toggleSound]);

  // ── Head row tags for current card ────────────────────────────────────────
  const currentTags: SwipeCardTag[] = current
    ? [
        ...(current.tags ?? [
          { label: current.lensValue, variant: 'audience' as const },
          { label: current.hookStyle, variant: 'style' as const },
        ]),
        ...(current.edited ? [{ label: 'Edited', variant: 'style' as const }] : []),
      ]
    : [];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-0 flex-col">

      <DeckAppBar
        onBack={onBack}
        subLabel={subLabel}
        showSourceToggle={showSourceToggle}
        lenses={lenses}
        keptCount={keptCards.length}
        soundOn={soundOn}
        onToggleSound={toggleSound}
      />

      {/* ── Two-col layout ────────────────────────────────────────────────── */}
      <div
        className="mx-auto grid w-full max-w-[960px] items-start gap-12 px-5 pb-7 pt-1.5"
        style={{ gridTemplateColumns: '250px 1fr' }}
      >
        {/* ── Sidebar: kept list ─────────────────────────────────────────── */}
        <aside
          className="sticky top-24 hidden sm:block"
          aria-label="Kept videos"
        >
          <h2 className="mb-2.5 text-[14px] font-semibold text-[var(--mute,#7c7d82)]">
            Kept videos
          </h2>
          {keptCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--line,#e8e5e1)] p-[14px] text-[13.5px] text-[var(--mute,#7c7d82)]">
              Swipe right to keep a variation, then tap Edit to build the slideshow.
            </div>
          ) : (
            keptCards.map((c) => <KeptItem key={c.id} card={c} onEdit={(cardId) => { onEdit?.(cardId); }} />)
          )}
        </aside>

        {/* ── Main area ─────────────────────────────────────────────────── */}
        <main className="flex flex-col items-center">

          {/* Filter chips */}
          <div
            role="group"
            aria-label="Filter by audience"
            className="mb-0 flex w-full max-w-[380px] gap-1.5 overflow-x-auto pb-2.5 scrollbar-hide"
          >
            <button
              type="button"
              data-f="all"
              aria-pressed={filter === 'all'}
              onClick={() => setFilter('all')}
              className="flex-none rounded-full border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] px-3 py-1.5 text-[13px] font-semibold text-[var(--ink,#000)] aria-pressed:border-[var(--ink,#000)] aria-pressed:bg-[var(--ink,#000)] aria-pressed:text-[var(--btn-ink,#fff)]"
            >
              All
              <small className="ml-1 font-medium opacity-60">{allNewCount}</small>
            </button>
            {lenses.map((lens) => (
              <button
                key={lens.id}
                type="button"
                aria-pressed={filter === lens.id}
                onClick={() => setFilter(lens.id)}
                className="flex-none rounded-full border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] px-3 py-1.5 text-[13px] font-semibold text-[var(--ink,#000)] aria-pressed:border-[var(--ink,#000)] aria-pressed:bg-[var(--ink,#000)] aria-pressed:text-[var(--btn-ink,#fff)]"
              >
                {lens.label}
                <small className="ml-1 font-medium opacity-60">{lensCounts[lens.id] ?? 0}</small>
              </button>
            ))}
          </div>

          {/* Head row: audience tag, style tag */}
          {current && (
            <div className="mb-2.5 flex w-full max-w-[380px] flex-wrap items-center gap-1.5">
              {currentTags.map((tag, i) => (
                <span
                  key={i}
                  className={[
                    'rounded-full border px-[11px] py-[5px] text-[12.5px] font-semibold',
                    tag.variant === 'style' || tag.variant === 'edited'
                      ? 'border-transparent bg-[var(--soft-2,#e6e1db)] text-[var(--ink,#000)]'
                      : 'border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] text-[var(--ink,#000)]',
                  ].join(' ')}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}

          {/* ── Card deck (stacked, 9:16, max 380px) ──────────────────────── */}
          <div
            className="relative w-full max-w-[380px]"
            style={{
              aspectRatio: '9/16',
            }}
            aria-live="polite"
          >
            {/* back2 */}
            {next2 && (
              <SwipeCard
                key={next2.id}
                shots={next2.shots}
                position="back2"
                hue={next2.hue}
                onKeep={() => {}}
                onDiscard={() => {}}
                onOpen={() => {}}
              />
            )}

            {/* back1 */}
            {next1 && (
              <SwipeCard
                key={next1.id}
                shots={next1.shots}
                position="back1"
                hue={next1.hue}
                onKeep={() => {}}
                onDiscard={() => {}}
                onOpen={() => {}}
              />
            )}

            {/* top */}
            {current ? (
              <SwipeCard
                key={current.id}
                shots={current.shots}
                tags={currentTags}
                whyPanel={current.whyPanel}
                position="top"
                hue={current.hue}
                exitDirection={exitMap[current.id] ?? null}
                onKeep={handleKeep}
                onDiscard={handleSkip}
                onOpen={handleEditOpen}
                externalPause={paused}
                soundOn={soundOn}
                ariaLabel={`Video for ${current.lensValue}: ${current.hookStyle} hook`}
              />
            ) : (
              <DoneScreen
                cards={cards}
                lenses={lenses}
                filter={filter}
                onShowAll={() => setFilter('all')}
                onMakeMore={onMakeMore}
                onEdit={(cardId) => { onEdit?.(cardId); }}
              />
            )}
          </div>

          {/* ── Controls ─────────────────────────────────────────────────── */}
          <div className="mt-9 flex items-center justify-center gap-3.5">
            {/* Skip */}
            <button
              type="button"
              disabled={!current}
              onClick={handleSkip}
              aria-label="Skip this video"
              className="grid h-[68px] w-[68px] place-items-center rounded-full border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] text-[#555] shadow-[0_8px_18px_-12px_rgba(0,0,0,.35)] active:scale-[.94] disabled:opacity-35"
            >
              <X aria-hidden className="h-7 w-7" strokeWidth={2.6} strokeLinecap="round" />
            </button>

            {/* Edit */}
            <button
              type="button"
              disabled={!current}
              onClick={handleEditOpen}
              aria-label="Edit this video"
              className="grid h-[50px] w-[50px] place-items-center rounded-full border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] text-[var(--ink,#000)] shadow-[0_8px_18px_-12px_rgba(0,0,0,.35)] active:scale-[.94] disabled:opacity-35"
            >
              <Pencil aria-hidden className="h-[21px] w-[21px]" strokeWidth={2.2} />
            </button>

            {/* Keep */}
            <button
              type="button"
              disabled={!current}
              onClick={handleKeep}
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
              disabled={history.length === 0}
              onClick={handleUndo}
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
        </main>
      </div>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      <div
        role="status"
        className={[
          'fixed bottom-[calc(20px+env(safe-area-inset-bottom,0px))] left-1/2 z-30 w-[calc(100%-28px)] max-w-[460px] -translate-x-1/2 rounded-[18px] bg-[var(--ink,#000)] px-[14px] py-3 shadow-[0_18px_40px_-18px_rgba(0,0,0,.6)] transition-[transform,visibility] duration-[250ms]',
          toast ? 'translate-y-0 visible' : 'translate-y-[calc(100%+60px)] invisible',
        ].join(' ')}
      >
        {toast && (
          <>
            <div className="flex items-center gap-2.5 text-[14px] font-medium text-[var(--btn-ink,#fff)]">
              <span className="flex-1">{toast.message}</span>
              {toast.withUndo && (
                <button
                  type="button"
                  onClick={handleUndo}
                  className="text-[14px] font-bold underline underline-offset-[3px]"
                >
                  Undo
                </button>
              )}
            </div>
            {/* Skip reasons */}
            {toast.skipReasonFor && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {SKIP_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      if (toast.skipReasonFor) {
                        setCards((prev) =>
                          prev.map((c) => (c.id === toast.skipReasonFor!.id ? { ...c, reason: r } : c)),
                        );
                        onSkipReason?.(toast.skipReasonFor.id, r);
                        onSwipe?.(toast.skipReasonFor, 'discard', r);
                      }
                      setToast(null);
                    }}
                    className={[
                      'rounded-full border px-[11px] py-1.5 text-[13px] font-medium text-[var(--btn-ink,#fff)]',
                      toast.pickedReason === r
                        ? 'bg-[var(--btn-ink,#fff)] text-[var(--ink,#000)]'
                        : 'border-[color-mix(in_srgb,var(--btn-ink,#fff)_30%,transparent)]',
                    ].join(' ')}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Hidden music player: restarts at the track's best moment on every new card */}
      {trackUrl && (
        <audio
          key={`${current?.id ?? 'none'}-${trackUrl}`}
          ref={audioRef}
          src={trackUrl}
          loop
          preload="auto"
          onLoadedMetadata={(e) => {
            e.currentTarget.volume = 0.5;
            e.currentTarget.currentTime = trackStart;
          }}
          className="hidden"
        />
      )}

      {/* Drift animation for video shimmer */}
      <style>{`@keyframes drift{to{background-position:120px 0}}.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{scrollbar-width:none}`}</style>
    </div>
  );
}
