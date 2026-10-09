import type { Prisma } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { changeDay, listIdeas, patchIdea } from '../../../src/server/labs/calendarIdeas';
import type { DeckItem } from '../../../src/server/slideshow/core/deckAssembly';
import { createTestWorkspace, resetBusinessTables } from '../../helpers/db';

beforeEach(async () => {
  await resetBusinessTables();
  await prisma.slideshowVariant.deleteMany({});
});
afterAll(() => prisma.$disconnect());

const TOMORROW = new Date(Date.now() + 26 * 60 * 60 * 1000);

/** A minimal Blitz deck card: what the ideas list reads from a saved row. */
const card = (hook: string, lens = 'busy-moms'): DeckItem => ({
  id: 'x',
  variantId: null,
  engine: 'website',
  lensId: lens,
  lensLabel: 'Busy moms',
  archetype: 'curiosity',
  hookStyle: 'Curiosity',
  shots: [{ role: 'hook', text: hook, textZone: 'middle', durationSec: 3, source: 'library', mediaUrl: '/x.jpg', mediaKind: 'image', mediaLabel: 'x', photoTag: 'x', alternatives: [] }],
  hue: 200,
  audio: null,
  whyPanel: { audience: 'Busy moms', hookStyle: 'Curiosity', hookStyleReason: '', storyLines: [], proofNote: '', musicLabel: '' },
} as unknown as DeckItem);

const blitzRow = (workspaceId: string, hook: string, plannedAt: Date | null, lens = 'busy-moms') =>
  prisma.slideshowVariant.create({
    data: { workspaceId, engine: 'website', lens, archetype: 'curiosity', plannedAt, plan: { card: card(hook, lens) } as unknown as Prisma.InputJsonValue },
  });

describe('calendar ideas', () => {
  it('lists planned ideas with the reserve cards of the same audience as other hooks', async () => {
    const ws = await createTestWorkspace('slideshow');
    const idea = await blitzRow(ws.id, 'Stop doing this at night', TOMORROW);
    await blitzRow(ws.id, 'The night routine nobody tells you', null);
    await blitzRow(ws.id, 'Other audience hook', null, 'retirees');
    const { ideas, slideshowPct } = await listIdeas(ws.id);
    expect(slideshowPct).toBe(10);
    expect(ideas).toHaveLength(1);
    expect(ideas[0]).toMatchObject({ id: idea.id, format: 'blitz', status: 'proposed', hook: 'Stop doing this at night' });
    expect(ideas[0]!.hooks.map((h) => h.text)).toEqual(['The night routine nobody tells you']);
  });

  it('a skipped idea leaves its day to a reserve card; undo brings it back', async () => {
    const ws = await createTestWorkspace('slideshow');
    const idea = await blitzRow(ws.id, 'First', TOMORROW);
    const spare = await blitzRow(ws.id, 'Spare', null);
    const after = await patchIdea(ws.id, idea.id, { status: 'discarded' });
    expect(after.ideas.find((i) => i.id === idea.id)?.status).toBe('discarded');
    expect(after.ideas.find((i) => i.id === spare.id)).toMatchObject({ status: 'proposed', plannedAt: TOMORROW.toISOString() });
    const undone = await patchIdea(ws.id, idea.id, { status: 'proposed' });
    expect(undone.ideas.find((i) => i.id === idea.id)?.status).toBe('proposed');
  });

  it('another hook swaps the idea with its reserve sibling on the same day', async () => {
    const ws = await createTestWorkspace('slideshow');
    const idea = await blitzRow(ws.id, 'First', TOMORROW);
    const sibling = await blitzRow(ws.id, 'Second', null);
    const { ideas } = await patchIdea(ws.id, idea.id, { hookId: sibling.id });
    expect(ideas.map((i) => i.id)).toEqual([sibling.id]);
    expect(ideas[0]!.plannedAt).toBe(TOMORROW.toISOString());
    expect((await prisma.slideshowVariant.findUniqueOrThrow({ where: { id: idea.id } })).plannedAt).toBeNull();
  });

  it('a bank card offers its story\'s other hooks and swaps its first line in place', async () => {
    const ws = await createTestWorkspace('slideshow');
    const bankCard = { ...card('Main hook'), script: { storyId: 's1', archetype: 'curiosity', otherHooks: [{ archetype: 'call_out', text: 'Moms, this is you' }] } };
    const idea = await prisma.slideshowVariant.create({
      data: { workspaceId: ws.id, engine: 'website', lens: 'busy-moms', archetype: 'curiosity', plannedAt: TOMORROW, plan: { card: bankCard } as unknown as Prisma.InputJsonValue },
    });
    await blitzRow(ws.id, 'Reserve card of another story', null);
    const before = await listIdeas(ws.id);
    expect(before.ideas[0]!.hooks).toEqual([{ id: 'hook:call_out', text: 'Moms, this is you' }]);
    const { ideas } = await patchIdea(ws.id, idea.id, { hookId: 'hook:call_out' });
    expect(ideas[0]).toMatchObject({ id: idea.id, hook: 'Moms, this is you', plannedAt: TOMORROW.toISOString() });
    expect(ideas[0]!.hooks).toEqual([{ id: 'hook:curiosity', text: 'Main hook' }]);
    expect(ideas[0]!.card!.script).toMatchObject({ storyId: 's1', archetype: 'call_out' });
    expect((await prisma.slideshowVariant.findUniqueOrThrow({ where: { id: idea.id } })).archetype).toBe('call_out');
  });

  it('keeps ideas inside their workspace', async () => {
    const mine = await createTestWorkspace('slideshow');
    const other = await createTestWorkspace('slideshow');
    const idea = await blitzRow(other.id, 'Not yours', TOMORROW);
    await expect(patchIdea(mine.id, idea.id, { status: 'kept' })).rejects.toMatchObject({ status: 404 });
  });

  it('"+" puts a reserve card on the day and "−" sends the day\'s last idea back', async () => {
    const ws = await createTestWorkspace('slideshow');
    const spare = await blitzRow(ws.id, 'Spare', null);
    const day = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    const added = await changeDay(ws.id, { action: 'add', day, tzOffsetMin: 0 });
    expect(added.ideas.map((i) => [i.id, i.plannedAt])).toEqual([[spare.id, `${day}T19:00:00.000Z`]]);
    const removed = await changeDay(ws.id, { action: 'remove', day, tzOffsetMin: 0 });
    expect(removed.ideas).toEqual([]);
    expect((await prisma.slideshowVariant.findUniqueOrThrow({ where: { id: spare.id } })).plannedAt).toBeNull();
  });
});

