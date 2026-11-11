import type { Prisma } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../src/lib/db';
import type { DeckItem } from '../../../src/server/slideshow/core/deckAssembly';
import { createTestWorkspace, resetBusinessTables } from '../../helpers/db';

const card = (hook: string) => ({
  id: 'x', variantId: null, engine: 'website', lensId: 'moms', lensLabel: 'Moms', archetype: 'curiosity', hookStyle: 'Curiosity',
  shots: [{ role: 'hook', text: hook, textZone: 'middle', durationSec: 3, source: 'library', mediaUrl: '/x.jpg', mediaKind: 'image', mediaLabel: 'x', photoTag: 'x', alternatives: [] }],
  hue: 200, audio: null, whyPanel: { audience: 'Moms', hookStyle: 'Curiosity', hookStyleReason: '', storyLines: [], proofNote: '' },
}) as unknown as DeckItem;

// The Blitz Script Bank's deck: 14 new reserve cards, saved like bankDeck saves them.
vi.mock('../../../src/server/labs/blitzBank', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/server/labs/blitzBank')>()),
  bankDeck: async (workspaceId: string) => {
    const rows = await Promise.all(Array.from({ length: 14 }, (_, i) => prisma.slideshowVariant.create({
      data: { workspaceId, engine: 'website', lens: 'moms', archetype: 'curiosity', plan: { card: card(`New ${i}`) } as unknown as Prisma.InputJsonValue },
    })));
    return { cards: rows.map((r, i) => ({ ...card(`New ${i}`), variantId: r.id })), grow: async () => undefined };
  },
}));

const { generateIdeas } = await import('../../../src/server/labs/calendarIdeas');

beforeEach(async () => {
  await resetBusinessTables();
  await prisma.slideshowVariant.deleteMany({});
});
afterAll(() => prisma.$disconnect());

const SOON = new Date(Date.now() + 26 * 60 * 60 * 1000);
const oldIdea = (workspaceId: string, status: string) =>
  prisma.slideshowVariant.create({
    data: { workspaceId, engine: 'website', lens: 'moms', archetype: 'curiosity', status, plannedAt: SOON, plan: { card: card(`Old ${status}`) } as unknown as Prisma.InputJsonValue },
  });

describe('a new batch of ideas', () => {
  it('replaces the deck: earlier skipped and waiting ideas leave it, kept ones stay', async () => {
    const ws = await createTestWorkspace('slideshow');
    await oldIdea(ws.id, 'discarded');
    const waiting = await oldIdea(ws.id, 'proposed');
    await oldIdea(ws.id, 'kept');
    const { list } = await generateIdeas(ws.id, 'run', 0);
    const hooks = list.ideas.map((i) => i.hook);
    expect(hooks.filter((h) => h.startsWith('New'))).toHaveLength(14);
    expect(hooks).not.toContain('Old discarded');
    expect(hooks).not.toContain('Old proposed');
    expect(list.ideas.find((i) => i.hook === 'Old kept')?.status).toBe('kept');
    // The waiting one goes back to the reserve, so a skipped day can still use it.
    expect((await prisma.slideshowVariant.findUniqueOrThrow({ where: { id: waiting.id } })).plannedAt).toBeNull();
  });
});
