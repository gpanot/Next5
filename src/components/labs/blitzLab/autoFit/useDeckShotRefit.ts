'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { TextConfig } from '../../../../remotion/types';
import { useLabClient } from '../../LabClientProvider';
import type { BlitzAssetDto } from '../api';
import type { DeckCardData } from '../SwipeDeck';
import { fitSlideCaption } from './fitSlideCaption';

type ShotRef = { cardId: string; index: number; assetKey: string; text: string };

/** Shots of `next` whose picture differs from `prev` (same cards, same order): their captions were fitted for another picture. */
function changedShots(prev: DeckCardData[], next: DeckCardData[]): ShotRef[] {
  const before = new Map(prev.map((c) => [c.id, c]));
  return next.flatMap((card) => card.shots.flatMap((shot, index) => {
    const key = shot.edit?.assetKey;
    const old = before.get(card.id)?.shots[index]?.edit?.assetKey;
    return key && key !== old && shot.text.trim() ? [{ cardId: card.id, index, assetKey: key, text: shot.text.trim() }] : [];
  }));
}

/**
 * Deck cards whose picture changes outside the editor (a regenerated or deleted deck image) get their captions fitted
 * again: one attempt per shot, and a failure keeps the caption where it is. Returns `apply(next)`, which sets the new
 * cards and fits the shots that changed.
 */
export function useDeckShotRefit(o: {
  deckCards: DeckCardData[];
  setDeckCards: Dispatch<SetStateAction<DeckCardData[]>>;
  assets: BlitzAssetDto[];
  captionConfig: TextConfig;
}) {
  const client = useLabClient();
  const { deckCards, setDeckCards, assets, captionConfig } = o;

  const refit = useCallback(async (shot: ShotRef, count: number) => {
    try {
      const fit = await fitSlideCaption(client, { backgroundKey: shot.assetKey, text: shot.text, index: shot.index, count, textConfig: captionConfig, assets });
      setDeckCards((prev) => prev.map((c) => (c.id !== shot.cardId ? c : {
        ...c,
        shots: c.shots.map((s, i) => (i === shot.index && s.edit && s.edit.assetKey === shot.assetKey && s.text.trim() === shot.text
          ? { ...s, edit: { ...s.edit, positionY: fit.positionY } }
          : s)),
      })));
    } catch (err) {
      console.warn(`[caption-fit] card ${shot.cardId} shot ${shot.index + 1} not fitted again; the caption keeps its position:`, err instanceof Error ? err.message : err);
    }
  }, [client, assets, captionConfig, setDeckCards]);

  return useCallback((update: (prev: DeckCardData[]) => DeckCardData[]) => {
    const next = update(deckCards);
    setDeckCards(next);
    const counts = new Map(next.map((c) => [c.id, c.shots.length]));
    changedShots(deckCards, next).forEach((shot) => void refit(shot, counts.get(shot.cardId) ?? 1));
  }, [deckCards, setDeckCards, refit]);
}
