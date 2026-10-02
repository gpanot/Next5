import { describe, expect, it } from 'vitest';
import { lineWidths, textRects, textTop } from '../../../src/server/autoSlideshow/textPlacement';

const meat = { role: 'item' as const, title: 'Check Charging, Not Just Range', body: 'Plan where you’ll charge, so trips feel easy.' };
const hook = { role: 'hook' as const, title: '5 Things EV Owners Wish They Knew', body: '' };

/** Head box as shares of the photo; 1350 px tall slide. */
const head = (topPx: number, bottomPx: number, left = 0.3, right = 0.45) => ({ top: topPx / 1350, bottom: bottomPx / 1350, left, right });

const blockBottom = (slide: typeof meat, top: number) => top + Math.max(...textRects(slide).map((r) => r.y + r.h));

describe('lineWidths', () => {
  it('wraps words onto new lines at the max width', () => {
    expect(lineWidths('aa bb cc', 10, 1, 50)).toEqual([50, 20]);
    expect(lineWidths('', 10, 1, 50)).toEqual([]);
  });
});

describe('textTop', () => {
  it('keeps the usual spot when no head is known or the spot is clear', () => {
    expect(textTop(meat)).toBe(330);
    expect(textTop(meat, null)).toBe(330);
    expect(textTop(meat, [])).toBe(330);
    expect(textTop(hook, [head(900, 1000)])).toBe(360);
  });

  it('moves the text off a head under its usual spot (the EV charger slide)', () => {
    const heads = [head(430, 560), head(520, 600, 0.7, 0.8)];
    const top = textTop(meat, heads);
    expect(top).not.toBe(330);
    expect(top).toBeGreaterThanOrEqual(110);
    // Clear of the higher head, with margin, whether it moved above or below it.
    expect(blockBottom(meat, top) <= 430 - 28 || top >= 600 + 28).toBe(true);
  });

  it('ignores a head beside short text', () => {
    expect(textTop({ role: 'hook', title: 'Stop', body: '' }, [head(360, 460, 0.02, 0.12)])).toBe(360);
  });

  it('stays between the top tabs and the bottom caption when heads are everywhere', () => {
    const top = textTop(meat, [head(0, 1350, 0, 1)]);
    expect(top).toBe(330);
  });
});
