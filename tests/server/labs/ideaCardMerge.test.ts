import { describe, expect, it } from 'vitest';
import { mergeCard } from '../../../src/server/labs/ideaCardMerge';
import type { DeckItem, DeckShot } from '../../../src/server/slideshow/core/deckAssembly';

const shot = (text: string, extra: Partial<DeckShot> = {}) => ({ text, assetKey: 'a.png', mediaKind: 'image', positionY: 0.5, ...extra }) as DeckShot;
const card = (shots: DeckShot[], extra: Partial<DeckItem> = {}) => ({ id: 'c', shots, finishing: true, ...extra }) as DeckItem;

describe('mergeCard', () => {
  it('keeps spoken lines adopted while the finishing step ran, and adds its changes', () => {
    const base = card([shot('old hook'), shot('old line')]);
    const mine = { ...card([shot('old hook', { camera: { move: 'push_in', focusX: 0.5, focusY: 0.5, strength: 'medium', pan: 'none' } }), shot('old line', { positionY: 0.7 })]) };
    delete mine.finishing;
    const now = card([shot('spoken hook'), shot('spoken line')], { voice: 'Achird' });
    const out = mergeCard(base, mine, now);
    expect(out.shots.map((s) => s.text)).toEqual(['spoken hook', 'spoken line']);
    expect(out.shots[0]!.camera?.move).toBe('push_in');
    expect(out.shots[1]!.positionY).toBe(0.7);
    expect(out.voice).toBe('Achird');
    expect(out.finishing).toBeUndefined();
  });

  it('leaves fields the step did not touch as they are now', () => {
    const base = card([shot('a')]);
    const now = card([shot('a', { assetKey: 'swapped.jpg' })]);
    expect(mergeCard(base, base, now).shots[0]!.assetKey).toBe('swapped.jpg');
  });
});
