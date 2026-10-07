import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { persistCards, type DeckItem } from '../../../src/server/slideshow/core/deckAssembly';
import { DECK_MIN_PENDING, nextDeckBatch, refillAfterSwipe, refillIfLow, savedDeck } from '../../../src/server/labs/workspaceDeck';
import { createTestWorkspace, resetBusinessTables } from '../../helpers/db';

const generate = vi.hoisted(() => vi.fn());
vi.mock('../../../src/server/labs/websiteDeck', () => ({ generateWebsiteDeck: generate }));

beforeEach(async () => {
  await resetBusinessTables();
  await prisma.slideshowVariant.deleteMany({});
  generate.mockReset();
  generate.mockResolvedValue([]);
});
afterAll(() => prisma.$disconnect());

const card = (hook: string, i: number): DeckItem => ({
  id: `tmp-${i}`,
  variantId: null,
  engine: 'website',
  lensId: 'busy-moms',
  lensLabel: 'Busy moms',
  archetype: 'curiosity',
  hookStyle: 'Curiosity',
  shots: [{ role: 'hook', text: hook, textZone: 'middle', durationSec: 3, source: 'library', mediaUrl: '/x.jpg', mediaKind: 'image', mediaLabel: 'x', photoTag: 'x', alternatives: [] }],
  hue: 200,
  audio: null,
  whyPanel: { audience: 'Busy moms', hookStyle: 'Curiosity', hookStyleReason: '', storyLines: [], proofNote: '', musicLabel: '' },
} as unknown as DeckItem);

async function setup() {
  const ws = await createTestWorkspace('slideshow');
  const profile = await prisma.studioBrandProfile.create({ data: { workspaceId: ws.id, sourceUrl: 'https://example.com' } });
  const run = await prisma.studioRun.create({ data: { workspaceId: ws.id, brandProfileId: profile.id, createdBy: 'user' } });
  return { workspaceId: ws.id, runId: run.id };
}

const saveBatch = (runId: string, workspaceId: string, hooks: string[]) =>
  persistCards(hooks.map(card), { workspaceId, deckRunId: runId });

describe('workspace deck', () => {
  it('brings back unswiped and kept cards in deck order, not skipped ones or other decks', async () => {
    const { workspaceId, runId } = await setup();
    const [a, b, c] = await saveBatch(runId, workspaceId, ['A', 'B', 'C']);
    await persistCards([card('Admin deck', 9)], { workspaceId });
    await prisma.slideshowVariant.update({ where: { id: b!.id }, data: { status: 'discarded' } });
    await prisma.slideshowVariant.update({ where: { id: c!.id }, data: { status: 'kept' } });

    const saved = await savedDeck(runId, workspaceId);
    expect(saved.map((s) => [s.item.id, s.status])).toEqual([[a!.id, 'new'], [c!.id, 'kept']]);
    expect(saved[0]!.item).toMatchObject({ lensLabel: 'Busy moms', hue: 200, variantId: a!.id });
  });

  it('next batch returns cards built in the background before building a new one', async () => {
    const { workspaceId, runId } = await setup();
    const [a, b] = await saveBatch(runId, workspaceId, ['A', 'B']);

    const ready = await nextDeckBatch(runId, workspaceId, new Set([a!.id]));
    expect(ready.map((i) => i.id)).toEqual([b!.id]);
    expect(generate).not.toHaveBeenCalled();

    await nextDeckBatch(runId, workspaceId, new Set([a!.id, b!.id]));
    expect(generate).toHaveBeenCalledWith(runId, { contentDeck: true });
    expect((await prisma.studioRun.findUnique({ where: { id: runId } }))?.deckRefillAt).toBeNull();
  });

  it('refills only when few cards are left and no other batch is being built', async () => {
    const { workspaceId, runId } = await setup();
    await saveBatch(runId, workspaceId, Array.from({ length: DECK_MIN_PENDING }, (_, i) => `H${i}`));
    await refillIfLow(runId, workspaceId);
    expect(generate).not.toHaveBeenCalled();

    const [first] = await savedDeck(runId, workspaceId);
    await prisma.slideshowVariant.update({ where: { id: first!.item.id }, data: { status: 'kept' } });
    await prisma.studioRun.update({ where: { id: runId }, data: { deckRefillAt: new Date() } });
    await refillAfterSwipe(first!.item.id);
    expect(generate).not.toHaveBeenCalled();

    await prisma.studioRun.update({ where: { id: runId }, data: { deckRefillAt: null } });
    await refillAfterSwipe(first!.item.id);
    expect(generate).toHaveBeenCalledTimes(1);
  });
});
