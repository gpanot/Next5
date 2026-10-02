// Deck cards ↔ deck images: which still images the cards use, and how cards follow a
// regenerated or deleted image.

import type { MediaChoice } from './shotFormat';
import type { ShotView } from './SwipeCard';
import type { DeckCardData } from './SwipeDeck';

/** R2 keys of every still image the cards show, first use first. */
export function deckImageKeys(cards: DeckCardData[]): string[] {
  const keys = cards.flatMap((c) => c.shots.flatMap((s) => (s.mediaKind === 'image' && s.edit?.assetKey ? [s.edit.assetKey] : [])));
  return [...new Set(keys)];
}

const mapShots = (cards: DeckCardData[], fn: (shot: ShotView) => ShotView): DeckCardData[] =>
  cards.map((c) => ({ ...c, shots: c.shots.map(fn) }));

/** A regenerated image: same asset, new file. Every shot and swap using it follows. */
export function replaceImageInCards(cards: DeckCardData[], oldKey: string, next: { r2Key: string; url: string }): DeckCardData[] {
  const swap = (alt: MediaChoice): MediaChoice => (alt.assetKey === oldKey ? { ...alt, assetKey: next.r2Key, mediaUrl: next.url } : alt);
  return mapShots(cards, (shot) => {
    if (!shot.edit) return shot;
    const uses = shot.edit.assetKey === oldKey;
    return {
      ...shot,
      ...(uses ? { mediaUrl: next.url } : {}),
      edit: { ...shot.edit, ...(uses ? { assetKey: next.r2Key } : {}), alternatives: shot.edit.alternatives?.map(swap) },
    };
  });
}

/**
 * A deleted image: shots using it move to their first other swap. With no swap left the shot is
 * empty and Generate asks for a photo (Edit picks one).
 */
export function removeImageFromCards(cards: DeckCardData[], key: string): DeckCardData[] {
  return mapShots(cards, (shot) => {
    if (!shot.edit) return shot;
    const alternatives = shot.edit.alternatives?.filter((a) => a.assetKey !== key) ?? [];
    if (shot.edit.assetKey !== key) return { ...shot, edit: { ...shot.edit, alternatives } };
    const [next, ...rest] = alternatives;
    if (!next) {
      return { ...shot, mediaUrl: undefined, mediaLabel: undefined, edit: { ...shot.edit, assetKey: undefined, alternatives: [] } };
    }
    return {
      ...shot,
      mediaUrl: next.mediaUrl,
      mediaKind: next.mediaKind,
      mediaLabel: next.mediaLabel,
      edit: { ...shot.edit, assetKey: next.assetKey, trimStart: next.trimStart, positionY: next.positionY, alternatives: rest },
    };
  });
}
