// Shots with no photo get one before the connector schedules a video: made images first (stock or AI), one more
// try for the ones that failed, then the library's closest background. Shots that have a photo are left alone.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  batchShotImages: vi.fn(),
  searchShots: vi.fn(),
  update: vi.fn(async () => ({})),
}));

vi.mock('../../../src/lib/db', () => ({
  prisma: { slideshowVariant: { findUnique: async () => ({ plan: { other: 1 } }), update: m.update } },
}));
vi.mock('../../../src/server/labs/websiteDeck', () => ({ loadWebsiteSource: vi.fn(), photoBrand: vi.fn() }));
vi.mock('../../../src/server/labs/workspaceRun', () => ({ workspaceRunId: vi.fn() }));
vi.mock('../../../src/server/slideshow/core/imageNeeds', () => ({ batchShotImages: m.batchShotImages }));
vi.mock('../../../src/server/slideshow/core/media', () => ({
  searchShots: m.searchShots,
  libraryShot: async (ranked: Array<{ r2Key: string }>) => (ranked[0] ? { assetKey: ranked[0].r2Key, mediaUrl: `u/${ranked[0].r2Key}`, mediaKind: 'image', source: 'library', photoTag: 'library', alternatives: [] } : null),
}));

import { fillMissingPhotos, missingPhotos } from '../../../src/server/mcp/ideaPhotos';
import type { DeckItem } from '../../../src/server/slideshow/core/deckAssembly';

const shot = (role: string, assetKey?: string) => ({ role, text: `${role} line`, assetKey, alternatives: [] });
const card = { whyPanel: { audience: 'Homeowners' }, shots: [shot('hook'), shot('pain', 'have.jpg'), shot('proof'), shot('cta')] } as unknown as DeckItem;
const brand = { business: 'Acme', sells: 'Acme', look: null, productAsSubject: false };
const asset = (key: string) => ({ r2Key: key });

describe('fillMissingPhotos', () => {
  beforeEach(() => {
    m.batchShotImages.mockReset();
    m.searchShots.mockReset();
    m.update.mockClear();
  });

  it('lists the shots with no photo', () => {
    expect(missingPhotos(card)).toEqual([0, 2, 3]);
  });

  it('uses made images, retries a failed one alone, then falls back to the library', async () => {
    m.batchShotImages
      .mockResolvedValueOnce([new Map([['idea_1:0', asset('stock-hook.jpg')]])])
      .mockResolvedValueOnce([new Map([['idea_1:2', asset('stock-proof.jpg')]])])
      .mockResolvedValueOnce([new Map()]);
    m.searchShots.mockResolvedValue([[asset('have.jpg'), asset('lib-cta.jpg')]]);

    const out = await fillMissingPhotos('idea_1', card, 'ws_1', brand);

    expect(out.shots.map((s) => s.assetKey)).toEqual(['stock-hook.jpg', 'have.jpg', 'stock-proof.jpg', 'lib-cta.jpg']);
    expect(m.batchShotImages).toHaveBeenCalledTimes(3);
    expect(m.batchShotImages.mock.calls[1]![0]).toHaveLength(1);
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'idea_1' }, data: { plan: expect.objectContaining({ other: 1, shots: out.shots }) } }));
  });

  it('falls back to the library for images not made by the deadline', async () => {
    m.batchShotImages.mockImplementation(() => new Promise(() => undefined));
    m.searchShots.mockResolvedValueOnce([[asset('lib-hook.jpg')]]).mockResolvedValueOnce([[asset('lib-proof.jpg')]]).mockResolvedValueOnce([[]]);

    const out = await fillMissingPhotos('idea_1', card, 'ws_1', brand, 20);

    expect(out.shots.map((s) => s.assetKey)).toEqual(['lib-hook.jpg', 'have.jpg', 'lib-proof.jpg', undefined]);
  });

  it('leaves a full card untouched', async () => {
    const full = { ...card, shots: [shot('hook', 'a.jpg')] } as unknown as DeckItem;
    expect(await fillMissingPhotos('idea_1', full, 'ws_1', brand)).toBe(full);
    expect(m.batchShotImages).not.toHaveBeenCalled();
    expect(m.update).not.toHaveBeenCalled();
  });
});
