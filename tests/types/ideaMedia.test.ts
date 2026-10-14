import { describe, expect, it } from 'vitest';
import type { DeckItem } from '../../src/server/slideshow/core/deckAssembly';
import { nextClipOf, swapShotMedia } from '../../src/types/admin/ideaMedia';

const clip = (key: string, positionY?: number) => ({ mediaUrl: `https://cdn/${key}.mp4`, mediaKind: 'video' as const, mediaLabel: key, assetKey: key, positionY });

const cardWith = (shot: DeckItem['shots'][number]): DeckItem => ({ shots: [shot] } as unknown as DeckItem);

const shotA = { ...clip('a', 0.3), trimStart: 2, source: 'library' as const, photoTag: 'library', role: 'hook', text: 'Hi', textZone: 'middle' as const, durationSec: 3, alternatives: [clip('b'), clip('a'), clip('c')] } as unknown as DeckItem['shots'][number];

describe('swapShotMedia', () => {
  it('swaps to the next clip, then cycles back through every clip', () => {
    let card = cardWith(shotA);
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      const next = nextClipOf(card.shots[0])!;
      card = swapShotMedia(card, 0, next)!;
      seen.push(card.shots[0]!.assetKey!);
    }
    expect(seen).toEqual(['b', 'c', 'a']);
  });

  it('does not keep the old clip trim or caption height', () => {
    const swapped = swapShotMedia(cardWith(shotA), 0, 'b')!.shots[0]!;
    expect(swapped.trimStart).toBeUndefined();
    expect(swapped.positionY).toBeUndefined();
    expect(swapped.text).toBe('Hi');
  });

  it('undoes a swap by swapping back to the clip before', () => {
    const swapped = swapShotMedia(cardWith(shotA), 0, 'b')!;
    const back = swapShotMedia(swapped, 0, 'a')!.shots[0]!;
    expect(back.assetKey).toBe('a');
    expect(back.trimStart).toBe(2);
    expect(back.positionY).toBe(0.3);
  });

  it('refuses an unknown clip or a listing photo', () => {
    expect(swapShotMedia(cardWith(shotA), 0, 'zzz')).toBeNull();
    const listing = { ...shotA, source: 'listing', assetKey: undefined } as unknown as DeckItem['shots'][number];
    expect(nextClipOf(listing)).toBeNull();
  });
});
