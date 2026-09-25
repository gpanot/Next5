'use client';

/**
 * SlideshowDeckStep — the "Videos" step, for both engines.
 *
 * Flow position:
 *   Zillow:  Zillow URL → Angle → [THIS STEP: swipe deck + editor in one place]
 *   Website: Profile → [THIS STEP]  (6 cards per audience, interleaved; no TikTok research)
 *
 * Controlled: the parent owns the cards so edits made in the editor show up on the deck.
 * On mount with no cards: asks the engine for a deck (POST /blitz/slideshow-deck[/website]).
 * onEditCard: the parent opens the editor over this step; the deck stays mounted underneath.
 */

import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReAngle } from '../../../server/labs/slideshowCopy';
import type { DeckItem } from '../../../server/slideshow/core/deckAssembly';
import type { ZillowData } from './ZillowScrapeStep';
import { useLabClient } from '../LabClientProvider';
import { SwipeDeck } from './SwipeDeck';
import type { DeckCardData } from './SwipeDeck';
import type { ShotView } from './SwipeCard';
import { logDeckAction, type CopyCheckContext } from './deckApi';

/** Client-safe angle labels (the server sends lensLabel on each card too). */
export const ANGLE_LABELS: Record<ReAngle, string> = {
  just_listed: 'Just Listed',
  price_reduction: 'Price Reduction',
  open_house: 'Open House',
  feature_highlight: 'Feature Highlight',
  sold: 'Sold',
  neighborhood: 'Neighborhood',
};

// ── Deck source ───────────────────────────────────────────────────────────────

/** Where the deck comes from: a listing + angle (Zillow engine) or a Campaign Studio run (website engine). */
export type DeckSource =
  | { kind: 'zillow'; zillowData: ZillowData; angle: ReAngle; angleLabel: string }
  | { kind: 'website'; runId: string };

/** What a card from this source is checked against before render. Travels with the card (and its Set). */
export const checkContextFor = (source: DeckSource): CopyCheckContext =>
  source.kind === 'zillow' ? { engine: 'zillow', facts: source.zillowData.facts } : { engine: 'website', runId: source.runId };

function deckRequest(source: DeckSource): { path: string; body: unknown; label: string; sub: string } {
  if (source.kind === 'website') {
    return { path: '/blitz/slideshow-deck/website', body: { runId: source.runId }, label: 'your audiences', sub: 'From your brand profile' };
  }
  const { zillowData, angle, angleLabel } = source;
  return {
    path: '/blitz/slideshow-deck',
    body: {
      facts: zillowData.facts,
      angle,
      photoTags: zillowData.photoTags,
      selectedCandidates: zillowData.selectedCandidates,
      listingRunId: zillowData.listingRunId,
    },
    label: angleLabel,
    sub: `${angleLabel} · ${zillowData.facts.city ?? 'listing'}`,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Engine shot → card shot; library asset, trim, caption position and swaps ride along for the editor. */
function toShotView(shot: DeckItem['shots'][number]): ShotView {
  return {
    text:       shot.text,
    textZone:   shot.textZone,
    mediaUrl:   shot.mediaUrl || undefined,
    mediaKind:  shot.mediaKind,
    mediaLabel: shot.mediaLabel,
    photoTag:   shot.photoTag,
    edit: {
      source:       shot.source,
      assetKey:     shot.assetKey,
      trimStart:    shot.trimStart,
      positionY:    shot.positionY,
      durationSec:  shot.durationSec,
      alternatives: shot.alternatives,
    },
  };
}

/** Convert a ZillowDeckItem (from API) into a DeckCardData (for SwipeDeck). The batch keeps ids unique across batches. */
function toDeckCard(item: DeckItem, batch: number, check: CopyCheckContext): DeckCardData {
  return {
    check,
    id:         `${item.id}-b${batch}`,
    variantId:  item.variantId ?? undefined,
    audio:      item.audio,
    lensValue:  item.lensLabel,
    lensId:     item.lensId,
    hookStyle:  item.hookStyle,
    shots:      item.shots.map(toShotView),
    hue:        item.hue,
    whyPanel:   item.whyPanel,
    status:     'new',
  };
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function DeckLoading({ angleLabel }: { angleLabel: string }) {
  const steps = [
    { ms: 0,    label: 'Writing story lines…' },
    { ms: 4000, label: 'Generating 6 hook variations…' },
    { ms: 9000, label: 'Picking clips from the library…' },
  ];
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const timers = steps.slice(1).map((s, i) =>
      setTimeout(() => setStepIdx(i + 1), s.ms),
    );
    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex w-full max-w-[460px] flex-col items-center gap-6 py-12">
      {/* Animated card stack placeholder */}
      <div className="relative h-[180px] w-[100px]">
        {[2, 1, 0].map((i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-[18px] bg-surface-alt"
            style={{
              transform: `translateY(${i * -10}px) scale(${1 - i * 0.04})`,
              filter: `brightness(${1 - i * 0.12})`,
              zIndex: 3 - i,
            }}
          />
        ))}
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <Loader2 aria-hidden className="h-8 w-8 animate-spin text-muted" />
        </div>
      </div>

      {/* Step label */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <Sparkles aria-hidden className="h-4 w-4 shrink-0 text-muted" />
          Making videos for <span className="text-ink">{angleLabel}</span>
        </div>
        <p className="text-[12px] text-muted transition-all duration-500">
          {steps[stepIdx]?.label}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5" aria-hidden>
        {steps.map((_, i) => (
          <span
            key={i}
            className={[
              'h-1.5 w-1.5 rounded-full transition-all duration-500',
              i <= stepIdx ? 'bg-ink scale-110' : 'bg-surface-alt',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

function DeckError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex w-full max-w-[380px] flex-col items-center gap-4 rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
      <p className="text-[14px] font-semibold text-red-700">Could not generate variations</p>
      <p className="text-[13px] text-red-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        <RefreshCw aria-hidden className="h-4 w-4" />
        Try again
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export type SlideshowDeckStepProps = {
  source: DeckSource;
  /** Deck cards owned by the parent. Empty on first visit → this step generates them. */
  cards: DeckCardData[];
  /** Called with new cards (generation) and on every status change (keep / skip / undo). */
  onCardsChange: (cards: DeckCardData[]) => void;
  /** Called when the user taps Edit on a card. */
  onEditCard: (card: DeckCardData) => void;
  /** True while the editor is open over the deck. */
  paused?: boolean;
  /** Back to the previous step (angle or profile). */
  onBack?: () => void;
  /** Music for cards without an engine track. */
  fallbackAudioUrl?: string;
};

export function SlideshowDeckStep({
  source,
  cards,
  onCardsChange,
  onEditCard,
  paused = false,
  onBack,
  fallbackAudioUrl,
}: SlideshowDeckStepProps) {
  const client = useLabClient();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(cards.length > 0 ? 'ready' : 'loading');
  const [errorMsg, setErrorMsg] = useState('');
  const request = deckRequest(source);

  /** First batch replaces the deck; "Make another batch" appends so kept cards stay. */
  const fetchDeck = async (existing: DeckCardData[]) => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch(client.url(request.path), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...client.authHeaders() },
        body: JSON.stringify(request.body),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? `Server error ${res.status}`);
      }

      const data = (await res.json()) as { deckItems: DeckItem[] };
      const batch = Date.now();
      const check = checkContextFor(source);
      onCardsChange([...existing, ...(data.deckItems ?? []).map((item) => toDeckCard(item, batch, check))]);
      setStatus('ready');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  };

  // Only fetch if the parent has no cards for this angle yet.
  useEffect(() => {
    if (cards.length === 0) void fetchDeck([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run only once on mount

  const angleLabel = request.label;

  if (status === 'loading') {
    return (
      <div className="flex w-full flex-col items-center py-4">
        <DeckLoading angleLabel={angleLabel} />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex w-full flex-col items-center py-4">
        <DeckError message={errorMsg} onRetry={() => void fetchDeck(cards)} />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 text-center text-[13px] text-amber-800">
        No videos were generated. {source.kind === 'zillow' ? 'Try a different angle.' : 'Check the brand profile and try again.'}
      </div>
    );
  }

  // One filter chip per audience / angle present in the deck.
  const lenses = [...new Map(cards.map((c) => [c.lensId, { id: c.lensId, label: c.lensValue }])).values()];

  return (
    <SwipeDeck
      cards={cards}
      lenses={lenses}
      subLabel={`${cards.length} variations · ${request.sub}`}
      onCardsChange={onCardsChange}
      onEdit={(cardId) => {
        const card = cards.find((c) => c.id === cardId);
        if (card) onEditCard(card);
      }}
      onMakeMore={() => void fetchDeck(cards)}
      paused={paused}
      onBack={onBack}
      fallbackAudioUrl={fallbackAudioUrl}
      onSwipe={(card, action, reason) => logDeckAction(client, card.variantId, action, reason ? { reason } : {})}
    />
  );
}
