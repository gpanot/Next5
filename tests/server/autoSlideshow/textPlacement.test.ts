import { describe, expect, it } from 'vitest';
import { headRect, lineWidths, MIN_HEAD_RATIO, placeText, textRects, textTop } from '../../../src/server/autoSlideshow/textPlacement';

const meat = { role: 'item' as const, title: 'Check Charging, Not Just Range', body: 'Plan where you’ll charge, so trips feel easy.' };
const hook = { role: 'hook' as const, title: '5 Things EV Owners Wish They Knew', body: '' };

/** The 9:16 slide is the old 4:5 one with 285 px above and below; px values below are on the old 4:5 slide. */
const SHIFT = 285;
/** Head box as shares of the photo; 1920 px tall slide, px given on the old 4:5 slide. */
const head = (topPx: number, bottomPx: number, left = 0.3, right = 0.45) => ({ top: (topPx + SHIFT) / 1920, bottom: (bottomPx + SHIFT) / 1920, left, right });

const blockBottom = (slide: typeof meat, top: number) => top + Math.max(...textRects(slide).map((r) => r.y + r.h));

describe('lineWidths', () => {
  it('wraps words onto new lines at the max width', () => {
    expect(lineWidths('aa bb cc', 10, 1, 50)).toEqual([50, 20]);
    expect(lineWidths('', 10, 1, 50)).toEqual([]);
  });
});

describe('textTop', () => {
  it('keeps the usual spot when no head is known or the spot is clear', () => {
    expect(textTop(meat)).toBe(330 + SHIFT);
    expect(textTop(meat, null)).toBe(330 + SHIFT);
    expect(textTop(meat, [])).toBe(330 + SHIFT);
    expect(textTop(hook, [head(900, 1000)])).toBe(360 + SHIFT);
  });

  it('moves the text off a head under its usual spot (the EV charger slide)', () => {
    const heads = [head(430, 560), head(520, 600, 0.7, 0.8)];
    const top = textTop(meat, heads);
    expect(top).not.toBe(330 + SHIFT);
    expect(top).toBeGreaterThanOrEqual(110 + SHIFT);
    // Clear of the higher head, with margin, whether it moved above or below it.
    expect(blockBottom(meat, top) <= 430 + SHIFT - 28 || top >= 600 + SHIFT + 28).toBe(true);
  });

  it('ignores a head beside short text', () => {
    expect(textTop({ role: 'hook', title: 'Stop', body: '' }, [head(360, 460, 0.02, 0.12)])).toBe(360 + SHIFT);
  });

  it('stays between the top tabs and the bottom caption when heads are everywhere', () => {
    const top = textTop(meat, [head(-SHIFT, 1350 + SHIFT, 0, 1)]);
    expect(top).toBe(330 + SHIFT);
  });
});

describe('placeText', () => {
  it('is centered at the usual spot, off heads, when the text was never moved', () => {
    expect(placeText(meat)).toEqual({ x: 0.5, y: (330 + SHIFT) / 1920 });
    const heads = [head(430, 560)];
    expect(placeText(meat, heads).y).toBe(textTop(meat, heads) / 1920);
  });

  it('keeps moved text where it was put, heads ignored', () => {
    expect(placeText({ ...hook, title: 'Stop', textAt: { x: 0.4, y: 0.6 } }, [head(1100, 1300)])).toEqual({ x: 0.4, y: 0.6 });
  });

  it('keeps moved text inside the slide', () => {
    const at = placeText({ ...meat, textAt: { x: 1, y: 1 } });
    // Pushed to the right edge it wraps in the narrowest box (40% of the width), TEXT_SIDE (13.6%) from the edge.
    const height = Math.max(...textRects(meat, 0.4 * 1080).map((r) => r.y + r.h)) / 1920;
    expect(at.x).toBeCloseTo(0.664);
    expect(at.y).toBeCloseTo(1 - height);
  });
});

describe('flat head boxes', () => {
  it('grows a box flatter than a head down to the chin (a face looking down, 2026-10-21)', () => {
    const slide = { role: 'item' as const, title: 'Follow Up For Non-Responders', body: 'Send a gentle reminder a little later, so more customers finish it.' };
    const flat = { top: 0.245, bottom: 0.305, left: 0.437, right: 0.597 };
    const chin = 0.245 * 1920 + (0.597 - 0.437) * 1080 * MIN_HEAD_RATIO;
    const top = textTop(slide, [flat]);
    expect(top >= chin || blockBottom(slide, top) <= 0.245 * 1920).toBe(true);
  });

  it('leaves a box of a normal head shape as it is', () => {
    const tall = { top: 0.2, bottom: 0.32, left: 0.4, right: 0.55 };
    expect(headRect(tall).h).toBeCloseTo((0.32 - 0.2) * 1920 + 56);
  });
});

describe('text looks', () => {
  it('places a hook by its headline look: outlined at the hook spot, boxed at the box spot', () => {
    expect(textTop({ ...hook, look: 'tiktok-default' })).toBe(360 + SHIFT);
    expect(textTop({ ...hook, look: 'black-box' })).toBe(300 + SHIFT);
  });

  it('makes a boxed subtitle taller than plain text', () => {
    const plain = textRects(meat)[1]!;
    const boxed = textRects({ ...meat, bodyLook: 'black-box' })[1]!;
    expect(boxed.h).toBeGreaterThan(plain.h);
  });
});
