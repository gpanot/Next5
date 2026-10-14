// Another clip for one shot of a Blitz idea: the deck's swap button, and its undo. Shared by the server (saves it) and
// the browser (shows it at once).

import type { DeckItem } from '../../server/slideshow/core/deckAssembly';
import type { MediaOption } from '../../server/slideshow/core/media';

type Shot = DeckItem['shots'][number];

/** The shot's own media, as an option (so a swap puts it back among the alternatives). */
const optionOf = (shot: Shot): MediaOption => ({
  mediaUrl: shot.mediaUrl,
  mediaKind: shot.mediaKind,
  mediaLabel: shot.mediaLabel,
  assetId: shot.assetId,
  assetKey: shot.assetKey,
  trimStart: shot.trimStart,
  positionY: shot.positionY,
});

/** A library shot can swap (a listing photo has no key, so it could not be swapped back). */
export const canSwap = (shot: Shot | undefined): boolean => Boolean(shot?.assetKey && shot.source === 'library');

/** The library media shot `index` can swap to: of its own kind (a photo for a photo, a clip for a clip), each once,
 *  none the card already shows on any step (the engine's runner-ups often include another step's clip, which would
 *  then show on two steps). */
export const swappableOf = (card: DeckItem, index: number): MediaOption[] => {
  const shot = card.shots[index];
  if (!shot || !canSwap(shot)) return [];
  const seen = new Set<string>(card.shots.flatMap((s) => (s.assetKey ? [s.assetKey] : [])));
  return shot.alternatives.filter((a) => a.mediaKind === shot.mediaKind && a.assetKey && !seen.has(a.assetKey) && seen.add(a.assetKey));
};

/** The card with `more` added to shot `index`'s alternatives (found in the library when its own ran out). */
export const withMoreOptions = (card: DeckItem, index: number, more: MediaOption[]): DeckItem => ({
  ...card,
  shots: card.shots.map((s, i) => (i === index ? { ...s, alternatives: [...s.alternatives, ...more] } : s)),
});

/** The next clip to try: the first runner-up. The swapped-out clip goes last, so pressing again cycles through all. */
export const nextClipOf = (card: DeckItem, index: number): string | null => swappableOf(card, index)[0]?.assetKey ?? null;

/** The card with shot `index` showing the alternative `assetKey`; null when the shot has no such alternative. */
export const swapShotMedia = (card: DeckItem, index: number, assetKey: string): DeckItem | null => {
  const shot = card.shots[index];
  const pick = swappableOf(card, index).find((a) => a.assetKey === assetKey);
  if (!shot || !pick) return null;
  // The engine may list the current clip among its runner-ups: only its own copy (with its trim) goes back, last.
  const rest = shot.alternatives.filter((a) => a.assetKey !== assetKey && a.assetKey !== shot.assetKey);
  // Fields the pick lacks must not keep the old clip's values (its trim, its caption height).
  const swapped: Shot = { ...shot, ...pick, assetId: pick.assetId, trimStart: pick.trimStart, positionY: pick.positionY, alternatives: [...rest, optionOf(shot)] };
  return { ...card, shots: card.shots.map((s, i) => (i === index ? swapped : s)) };
};
