import { describe, expect, it } from 'vitest';
import type { DeckItem } from '../../src/server/slideshow/core/deckAssembly';
import { nextClipOf, swapShotMedia } from '../../src/types/admin/ideaMedia';

const clip = (key: string, positionY?: number) => ({ mediaUrl: `https://cdn/${key}.mp4`, mediaKind: 'video' as const, mediaLabel: key, assetKey: key, positionY });

const cardWith = (...shots: Array<DeckItem['shots'][number]>): DeckItem => ({ shots } as unknown as DeckItem);

const shotA = { ...clip('a', 0.3), trimStart: 2, source: 'library' as const, photoTag: 'library', role: 'hook', text: 'Hi', textZone: 'middle' as const, durationSec: 3, alternatives: [clip('b'), clip('a'), clip('c')] } as unknown as DeckItem['shots'][number];

describe('swapShotMedia', () => {
  it('swaps to the next clip, then cycles back through every clip', () => {
    let card = cardWith(shotA);
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      const next = nextClipOf(card, 0)!;
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

  it('changes only its own shot, and skips clips another step already shows', () => {
    const shotB = { ...shotA, ...clip('b'), alternatives: [clip('a'), clip('d')] } as unknown as DeckItem['shots'][number];
    const card = cardWith(shotA, shotB);
    expect(nextClipOf(card, 0)).toBe('c');
    expect(nextClipOf(card, 1)).toBe('d');
    expect(swapShotMedia(card, 0, 'b')).toBeNull();
    const swapped = swapShotMedia(card, 0, 'c')!;
    expect(swapped.shots.map((s) => s.assetKey)).toEqual(['c', 'b']);
  });

  it('swaps a photo only for a photo, and a clip only for a clip', () => {
    const photo = (key: string) => ({ ...clip(key), mediaUrl: `https://cdn/${key}.jpg`, mediaKind: 'image' as const });
    const shotP = { ...shotA, ...photo('p'), alternatives: [clip('v1'), photo('p2'), clip('v2')] } as unknown as DeckItem['shots'][number];
    expect(nextClipOf(cardWith(shotP), 0)).toBe('p2');
    expect(swapShotMedia(cardWith(shotP), 0, 'v1')).toBeNull();
    const alone = { ...shotP, alternatives: [clip('v1')] } as unknown as DeckItem['shots'][number];
    expect(nextClipOf(cardWith(alone), 0)).toBeNull();
  });

  it('refuses an unknown clip or a listing photo', () => {
    expect(swapShotMedia(cardWith(shotA), 0, 'zzz')).toBeNull();
    const listing = { ...shotA, source: 'listing', assetKey: undefined } as unknown as DeckItem['shots'][number];
    expect(nextClipOf(cardWith(listing), 0)).toBeNull();
  });
});
