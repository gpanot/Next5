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

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { SwipeCard } from './SwipeCard';
import { KeptItem, type KeptRenderView } from './KeptList';
import { DeckControls, DoneScreen } from './SwipeDeckParts';
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
  /** The BlitzProject rendering (or rendered) this card. */
  renderProjectId?: string;
  /** Track Jev rated the best fit for this card (R2 key). Shown with a green dot in the music list. */
  jevAudioKey?: string;
  /** True once the Jev music pass ran for this card (hit or miss), so it runs once. */
  musicMatched?: boolean;
};

/** Deck sound (clip audio + music), on by default, remembered per browser. */
export type DeckSound = { on: boolean; toggle: () => void };

/** One entry in the undo history. */
type HistEntry = { id: string; from: DeckCardStatus };

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
  /** Pauses the top card and keyboard shortcuts, e.g. while the editor is open over the deck. */
  paused?: boolean;
  /** Music for cards without their own track (e.g. the editor's default library track). */
  fallbackAudioUrl?: string;
  /** Every deck action, for logging: keep, discard (reason arrives in a second call), undo. */
  onSwipe?: (card: DeckCardData, action: 'keep' | 'discard' | 'undo', reason?: string) => void;
  /** Renders a kept card in the background. Absent = no Generate button. */
  onGenerate?: (cardId: string) => void;
  /** Background render state per kept card. */
  renderFor?: (card: DeckCardData) => KeptRenderView | undefined;
  /** Right column, given the card on screen (top card or the one in Preview) and the deck's sound switch. */
  aside?: (card: DeckCardData | null, sound: DeckSound) => ReactNode;
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
  onKeep,
  onEdit,
  onSkipReason,
  onMakeMore,
  onCardsChange,
  paused = false,
  onSwipe,
  fallbackAudioUrl,
  onGenerate,
  renderFor,
  aside,
}: SwipeDeckProps) {
  const [cards, setCards] = useState<DeckCardData[]>(initialCards);
  const [filter, setFilter] = useState<string>('all');
  const [history, setHistory] = useState<HistEntry[]>([]);
  const [toast, setToast] = useState<ToastState>(null);
  const [exitMap, setExitMap] = useState<Record<string, 'keep' | 'discard'>>({});
  /** Kept card shown again in the card slot. Swipes and shortcuts are off while it shows. */
  const [previewId, setPreviewId] = useState<string | null>(null);
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

  const previewCard = cards.find((c) => c.id === previewId) ?? null;
  const current = previewCard ? null : (queue[0] ?? null);

  // ── Music for the top card (or the previewed one) ─────────────────────────
  const playing = previewCard ?? current;
  const trackUrl = playing?.audio?.url ?? fallbackAudioUrl;
  const trackStart = playing?.audio?.startAt ?? 0;
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (soundOn && !paused && trackUrl && playing) audio.play().catch(() => undefined); // autoplay may be blocked until a tap
    else audio.pause();
  }, [soundOn, paused, trackUrl, playing]);
  const next1 = current ? (queue[1] ?? null) : null;
  const next2 = current ? (queue[2] ?? null) : null;

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
    showToast({ message: 'Kept. Tap Generate to render it, or Edit to change it.', withUndo: true }, 3200);
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
      if (e.key === 'Escape') setPreviewId(null);
      else if (e.key === 'ArrowRight') handleKeep();
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


      {/* ── Kept list | deck | aside (music) ──────────────────────────────── */}
      <div className="mx-auto grid w-full max-w-[1240px] grid-cols-1 items-start gap-8 px-5 pb-7 pt-1.5 sm:grid-cols-[320px_1fr] lg:grid-cols-[340px_1fr_260px]">
        {/* ── Sidebar: kept list ─────────────────────────────────────────── */}
        <aside
          className="sticky top-4 hidden sm:block"
          aria-label="Kept videos"
        >
          <h2 className="mb-2.5 text-[14px] font-semibold text-[var(--mute,#7c7d82)]">
            Kept videos
          </h2>
          {keptCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--line,#e8e5e1)] p-[14px] text-[13.5px] text-[var(--mute,#7c7d82)]">
              Swipe right to keep a variation, then tap Generate to render it.
            </div>
          ) : (
            keptCards.map((c) => (
              <KeptItem
                key={c.id}
                card={c}
                actions={{ onEdit: (cardId) => onEdit?.(cardId), onPreview: setPreviewId, onGenerate, renderFor }}
              />
            ))
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

          {/* Preview bar: a kept card is back in the card slot */}
          {previewCard && (
            <div className="mb-2.5 flex w-full max-w-[380px] items-center justify-between gap-2">
              <span className="truncate text-[13px] font-semibold text-[var(--ink,#000)] dark:text-neutral-100">
                Preview · {previewCard.lensValue}
              </span>
              <button
                type="button"
                onClick={() => setPreviewId(null)}
                className="flex-none rounded-full border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--ink,#000)] transition-opacity hover:opacity-80"
              >
                Back to deck
              </button>
            </div>
          )}

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

            {/* kept card shown again (Preview) */}
            {previewCard ? (
              <SwipeCard
                key={`preview-${previewCard.id}`}
                shots={previewCard.shots}
                position="top"
                hue={previewCard.hue}
                onKeep={() => {}}
                onDiscard={() => {}}
                onOpen={() => onEdit?.(previewCard.id)}
                externalPause={paused}
                soundOn={soundOn}
                ariaLabel={`Preview of kept video for ${previewCard.lensValue}`}
              />
            ) : current ? (
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

          <DeckControls
            disabled={!current}
            canUndo={history.length > 0}
            onSkip={handleSkip}
            onEdit={handleEditOpen}
            onKeep={handleKeep}
            onUndo={handleUndo}
          />
        </main>

        {aside && (
          <div className="sm:col-span-2 lg:sticky lg:top-4 lg:col-span-1">
            {aside(playing, { on: soundOn, toggle: toggleSound })}
          </div>
        )}
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
          key={`${playing?.id ?? 'none'}-${trackUrl}`}
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
