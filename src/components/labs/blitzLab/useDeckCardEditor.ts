'use client';

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { useLabClient } from '../LabClientProvider';
import type { BlitzAssetDto } from './api';
import type { CurrentAssets } from './AssetsPanel';
import { checkDeckCopy, logDeckAction, type CopyCheckContext } from './deckApi';
import { SHOT_FORMAT, type MediaChoice } from './shotFormat';
import type { SlideData } from './SlidePreview';
import type { ShotView } from './SwipeCard';
import type { DeckCardData } from './SwipeDeck';
import { useListingPhotoImport } from './useListingPhotoImport';
import type { ZillowData } from './ZillowScrapeStep';

const SHOT_ROLES = ['hook', 'pain', 'old_way', 'mechanism', 'proof', 'inaction', 'cta'];
/** Render canvas height in px — caption drag deltas arrive in canvas px. */
const CANVAS_HEIGHT = 1920;

type Options = {
  /** Listing photos to import (Zillow). Null for website decks: every shot is a library clip. */
  zillowData: ZillowData | null;
  /** What edited copy is checked against before render. */
  checkContext: CopyCheckContext | null;
  deckCards: DeckCardData[];
  setDeckCards: Dispatch<SetStateAction<DeckCardData[]>>;
  editingCardId: string | null;
  setEditingCardId: (id: string | null) => void;
  slides: SlideData[];
  setSlides: Dispatch<SetStateAction<SlideData[]>>;
  currentSlideIndex: number;
  setCurrentSlideIndex: (i: number) => void;
  assets: BlitzAssetDto[];
  addAsset: (asset: BlitzAssetDto) => void;
  setCurrentAssets: Dispatch<SetStateAction<CurrentAssets>>;
};

/** A card shot → editor slide: text, library clip (already in R2), trim, caption position, fixed length. */
const toSlide = (shot: ShotView, i: number): SlideData => ({
  text: shot.text,
  backgroundKey: shot.edit?.assetKey,
  trimStart: shot.edit?.trimStart,
  positionY: shot.edit?.positionY,
  durationSec: shot.edit?.durationSec ?? SHOT_FORMAT[i]?.durationSec,
});

/** The shot's own media first (so a swap can be undone), then the engine's runner-ups. */
const choicesFor = (shot: ShotView): MediaChoice[] => [
  ...(shot.edit?.assetKey && shot.mediaUrl
    ? [{
        mediaUrl: shot.mediaUrl,
        mediaKind: shot.mediaKind ?? 'video',
        mediaLabel: shot.mediaLabel ?? 'Engine pick',
        assetKey: shot.edit.assetKey,
        trimStart: shot.edit.trimStart,
        positionY: shot.edit.positionY,
      }]
    : []),
  ...(shot.edit?.alternatives ?? []),
];

/**
 * Deck card ↔ editor bridge for the Videos step: opens a card in the editor, writes edits back
 * to the card, re-checks copy on the server before render, and logs open / edit / render.
 */
export function useDeckCardEditor(o: Options) {
  const client = useLabClient();
  const { setDeckCards, setSlides, setCurrentAssets } = o;
  const importListingPhotos = useListingPhotoImport({ zillowData: o.zillowData, addAsset: o.addAsset, setSlides });
  const [copyProblems, setCopyProblems] = useState<string[]>([]);
  const editingCard = o.deckCards.find((c) => c.id === o.editingCardId) ?? null;

  const openCard = (card: DeckCardData) => {
    o.setEditingCardId(card.id);
    setSlides(card.shots.map(toSlide));
    o.setCurrentSlideIndex(0);
    setCopyProblems([]);
    // Engine track first; otherwise the first library track, as before.
    const audioKey = card.audio?.assetKey ?? o.assets.find((a) => a.type === 'AUDIO')?.r2Key;
    if (audioKey) setCurrentAssets((prev) => ({ ...prev, audioKey }));
    // Only listing-photo shots need importing; library clips are already in R2.
    importListingPhotos(card.shots.map((s) => s.photoTag ?? 'other'));
    logDeckAction(client, card.variantId, 'open');
  };

  /** Remix: re-open a saved deck Set with the exact slides that were rendered. */
  const openRemix = (card: DeckCardData, slides: SlideData[]) => {
    setDeckCards((prev) => [...prev.filter((c) => c.id !== card.id), card]);
    o.setEditingCardId(card.id);
    setSlides(slides);
    o.setCurrentSlideIndex(0);
    setCopyProblems([]);
    logDeckAction(client, card.variantId, 'open');
  };

  /** Back to the deck: text and media edits go onto the card; an edited new card counts as kept. */
  const backToDeck = () => {
    const card = editingCard;
    o.setEditingCardId(null);
    if (!card) return;
    const texts = card.shots.map((shot, i) => (o.slides[i]?.text ?? shot.text).trim());
    const editedShots = SHOT_ROLES.filter((_, i) => texts[i] !== card.shots[i]?.text);
    const mediaChanged = card.shots.some((shot, i) => (o.slides[i]?.backgroundKey ?? undefined) !== (shot.edit?.assetKey ?? undefined)
      && shot.edit?.source === 'library');
    if (editedShots.length === 0 && !mediaChanged) return;

    setDeckCards((prev) => prev.map((c) => (c.id !== card.id ? c : {
      ...c,
      edited: true,
      status: c.status === 'new' ? 'kept' : c.status,
      shots: c.shots.map((shot, i) => {
        const slide = o.slides[i];
        const asset = slide?.backgroundKey ? o.assets.find((a) => a.r2Key === slide.backgroundKey) : undefined;
        if (!slide) return shot;
        return {
          ...shot,
          text: texts[i]!,
          ...(asset && shot.edit?.source === 'library'
            ? { mediaUrl: asset.url, mediaKind: asset.mediaKind === 'video' ? 'video' as const : 'image' as const, mediaLabel: asset.name }
            : {}),
          edit: shot.edit && { ...shot.edit, assetKey: slide.backgroundKey ?? shot.edit.assetKey, trimStart: slide.trimStart, positionY: slide.positionY },
        };
      }),
    })));
    logDeckAction(client, card.variantId, 'edit', { editedShots, shotTexts: texts });
  };

  /** Deck videos keep a caption position per slide (from the clip's text-safe zone); drag moves that one. */
  const dragSlideCaption = useCallback((_dx: number, dy: number) => {
    setSlides((prev) => prev.map((s, i) => (i !== o.currentSlideIndex ? s : {
      ...s,
      positionY: Math.min(0.95, Math.max(0.05, (s.positionY ?? 0.85) + dy / CANVAS_HEIGHT)),
    })));
  }, [setSlides, o.currentSlideIndex]);

  /** Server re-check of the edited copy. True = ok to render. */
  const checkBeforeRender = async (): Promise<boolean> => {
    // The card's own context first: a remixed Set keeps what it was made from.
    const context = editingCard?.check ?? o.checkContext;
    if (!editingCard || !context) return true;
    const problems = await checkDeckCopy(client, context, o.slides.map((s) => s.text));
    setCopyProblems(problems);
    return problems.length === 0;
  };

  const markRendered = (projectId: string | null) => {
    if (!editingCard || !projectId) return;
    setDeckCards((prev) => prev.map((c) => (c.id === editingCard.id ? { ...c, status: 'generated' } : c)));
    logDeckAction(client, editingCard.variantId, 'render', { blitzProjectId: projectId });
  };

  return {
    editingCard,
    copyProblems,
    clearCopyProblems: () => setCopyProblems([]),
    openCard,
    openRemix,
    backToDeck,
    dragSlideCaption,
    checkBeforeRender,
    markRendered,
    alternatives: editingCard ? editingCard.shots.map(choicesFor) : undefined,
    /** Sum of the fixed shot lengths (26 s) when a deck card is open. */
    fixedDurationSeconds: editingCard
      ? o.slides.reduce((sum, s, i) => sum + (s.durationSec ?? SHOT_FORMAT[i]?.durationSec ?? 0), 0)
      : null,
  };
}
