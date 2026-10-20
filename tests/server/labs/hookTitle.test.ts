import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/db', () => ({ prisma: {} }));

import { balanced } from '../../../src/server/labs/hookTitle';
import { captionBox, placeTitle, titleBox } from '../../../src/server/labs/hookTitlePlace';
import { buildIdeaRenderBody } from '../../../src/server/mcp/ideaRender';
import type { DeckItem } from '../../../src/server/slideshow/core/deckAssembly';

const H = 1920;
const overlaps = (a: { y: number; h: number }, b: { y: number; h: number }) => a.y < b.y + b.h && b.y < a.y + a.h;

describe('placeTitle', () => {
  const title = titleBox('Do you need Google ads in 2026?', 'tiktok-red');
  const hookCaption = captionBox('Most shops miss this first thing', 0.6);

  it('sits just above the hook caption when nothing is in the way', () => {
    const y = placeTitle({ title, hookCaption, nextCaption: null, faces: [] }).positionY;
    expect(y * H).toBeLessThanOrEqual(hookCaption.y);
    expect(hookCaption.y - y * H).toBeLessThan(60);
  });

  it('keeps off a face above the caption', () => {
    const face = { x: 300, y: hookCaption.y - 260, w: 480, h: 240 };
    const y = placeTitle({ title, hookCaption, nextCaption: null, faces: [face] }).positionY;
    const box = { y: y * H - title.h, h: title.h };
    expect(overlaps(box, face)).toBe(false);
    expect(overlaps(box, hookCaption)).toBe(false);
  });

  it('goes under the hook caption when there is no room above', () => {
    const high = captionBox('Most shops miss this first thing', 0.12);
    const y = placeTitle({ title, hookCaption: high, nextCaption: null, faces: [] }).positionY;
    expect(y * H - title.h).toBeGreaterThanOrEqual(high.y + high.h);
  });

  it('avoids the next shot caption when it can', () => {
    const next = captionBox('Your feed stays silent', 0.55);
    const y = placeTitle({ title, hookCaption, nextCaption: next, faces: [] }).positionY;
    expect(overlaps({ y: y * H - title.h, h: title.h }, next)).toBe(false);
  });

  it('moves the hook caption under the title when only the two together clear a face', () => {
    // A low caption (the title does not fit under it) with a face ending just above it (the title does not fit there).
    const capBottom = 0.72 * H - title.h + 10;
    const low = captionBox('Most shops miss this first thing', capBottom / H);
    const face = { x: 200, y: 300, w: 680, h: low.y - title.h - 300 };
    const placed = placeTitle({ title, hookCaption: low, nextCaption: null, faces: [face] });
    expect(placed.hookCaptionY).toBeDefined();
    const capTop = placed.hookCaptionY! * H - low.h;
    expect(placed.positionY * H).toBeLessThanOrEqual(capTop);
    expect(placed.positionY * H - title.h).toBeGreaterThanOrEqual(face.y + face.h);
  });
});

describe('balanced', () => {
  const pick = { style: 'tiktok-red' as const, otherWorks: true, reason: 'Bright photo.' };

  it('switches look when one already has most recent titles and the other reads as well', () => {
    expect(balanced(pick, ['tiktok-red', 'tiktok-red', 'tiktok-red', 'white-box']).style).toBe('white-box');
  });

  it('keeps the pick when the other look would not read as well', () => {
    expect(balanced({ ...pick, otherWorks: false }, ['tiktok-red', 'tiktok-red', 'tiktok-red']).style).toBe('tiktok-red');
  });

  it('keeps the pick while the mix is even', () => {
    expect(balanced(pick, ['white-box', 'tiktok-red', 'white-box']).style).toBe('tiktok-red');
  });
});

describe('hook title in the render body', () => {
  it('rides in the text override', () => {
    const shot = (i: number) => ({ role: 'hook', text: `Line ${i}`, textZone: 'bottom', durationSec: 4, mediaUrl: 'u', mediaKind: 'video', mediaLabel: 'Clip', source: 'library', photoTag: 'library', alternatives: [], assetKey: `a${i}.mp4`, positionY: 0.6 });
    const hookTitle = { text: 'Do you need ads?', style: 'white-box' as const, positionY: 0.4 };
    const card = { id: 'c', variantId: 'v', engine: 'website', lensId: 'l', lensLabel: 'L', archetype: 'curiosity', hookStyle: 'Curiosity', shots: [0, 1, 2].map(shot), hue: 1, audio: null, whyPanel: { audience: '', hookStyle: '', hookStyleReason: '', storyLines: [], proofNote: '' }, hookTitle } as unknown as DeckItem;
    const built = buildIdeaRenderBody(card, 'v', 't');
    expect('body' in built && built.body.textConfigOverride).toMatchObject({ hookTitle });
  });
});
