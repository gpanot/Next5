import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/db', () => ({ prisma: {} }));

import { buildIdeaRenderBody } from '../../../src/server/mcp/ideaRender';
import type { DeckItem } from '../../../src/server/slideshow/core/deckAssembly';

const shot = (i: number, assetKey: string = `blitz/a${i}.mp4`) => ({
  role: 'hook', text: `Line ${i}`, textZone: 'bottom', durationSec: i === 0 ? 3 : 4, mediaUrl: `https://cdn/a${i}`, mediaKind: 'video',
  mediaLabel: 'Clip', source: 'library', photoTag: 'library', alternatives: [], assetKey, trimStart: 1, positionY: 0.7,
});

const card = (over: Partial<DeckItem> = {}): DeckItem => ({
  id: 'c1', variantId: 'idea_1', engine: 'website', lensId: 'owners', lensLabel: 'Home owners', archetype: 'curiosity', hookStyle: 'Curiosity',
  shots: Array.from({ length: 7 }, (_, i) => shot(i)), hue: 10, audio: null,
  whyPanel: { audience: 'a', hookStyle: 'b', hookStyleReason: 'c', storyLines: [], proofNote: '' },
  ...over,
} as unknown as DeckItem);

describe('buildIdeaRenderBody', () => {
  it('builds the same request the Content page sends', () => {
    const out = buildIdeaRenderBody(card({ voice: 'Sulafat' } as Partial<DeckItem>), 'idea_1', 'tpl_carousel');
    if ('error' in out) throw new Error(out.error);
    const b = out.body;
    expect(b.templateId).toBe('tpl_carousel');
    expect(b.currentAssets).toEqual({ backgroundKey: 'blitz/a0.mp4' });
    expect(b.captionText).toBe('Line 0');
    expect(b.voice).toBe('Sulafat');
    expect(b.durationSeconds).toBe(3 + 6 * 4);
    expect(b.slides).toHaveLength(7);
    expect(b.slides?.[2]).toEqual({ text: 'Line 2', backgroundKey: 'blitz/a2.mp4', trimStart: 1, positionY: 0.7, durationSec: 4 });
    expect(b.textConfigOverride).toMatchObject({ fontSize: 74, strokeWidth: 0 });
    expect(b.set).toMatchObject({ version: 1, kind: 'deck', variantId: 'idea_1', lensLabel: 'Home owners' });
  });

  it('uses the default narrator when the card has none', () => {
    const out = buildIdeaRenderBody(card(), 'idea_1', 't');
    expect('body' in out && out.body.voice).toBeTruthy();
  });

  it('refuses a card still being finished or with a shot without media', () => {
    expect(buildIdeaRenderBody(card({ finishing: true }), 'idea_1', 't')).toHaveProperty('error');
    const missing = card();
    missing.shots[3] = shot(3, '') as unknown as DeckItem['shots'][number];
    expect(buildIdeaRenderBody(missing, 'idea_1', 't')).toHaveProperty('error');
  });
});
