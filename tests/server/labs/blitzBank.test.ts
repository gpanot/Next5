import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { bankDeck, ensureBlitzBank } from '../../../src/server/labs/blitzBank';
import type { BriefScript } from '../../../src/server/labs/websiteDeck';
import type { DeckItem } from '../../../src/server/slideshow/core/deckAssembly';
import { createTestWorkspace, resetBusinessTables } from '../../helpers/db';

const mocks = vi.hoisted(() => ({ writeBrief: vi.fn(), deckFromScripts: vi.fn(), runId: { current: '' } }));
vi.mock('../../../src/server/labs/websiteDeck', () => ({
  writeBrief: mocks.writeBrief,
  deckFromScripts: mocks.deckFromScripts,
  loadWebsiteSource: async () => ({ profile: {}, sourceUrl: 'https://example.com', workspaceId: null }),
}));
vi.mock('../../../src/server/slideshow/engines/website/engine', () => ({
  websiteEngine: { briefs: () => [{ idc: 'Busy moms', tone: 'casual' }] },
}));
vi.mock('../../../src/server/labs/workspaceRun', () => ({ workspaceRunId: async () => mocks.runId.current }));

let written = 0;
const script = (): BriefScript => {
  written += 1;
  return {
    idc: 'Busy moms', categories: ['family'], tone: 'casual', proofNote: '', slot: 0,
    story: { pain: `pain ${written}`, oldWay: 'o', mechanism: 'm', proof: 'p', inaction: 'i', cta: 'c' },
    hooks: [{ archetype: 'curiosity', text: `hook ${written}` }],
  };
};

beforeEach(async () => {
  await resetBusinessTables();
  await prisma.slideshowVariant.deleteMany({});
  await prisma.blitzScriptBank.deleteMany({});
  written = 0;
  mocks.writeBrief.mockReset().mockImplementation(async () => script());
  mocks.deckFromScripts.mockReset().mockImplementation(async (_source: unknown, scripts: BriefScript[]) =>
    scripts.map((s): DeckItem => ({ id: 'x', variantId: null, script: { storyId: s.storyId!, archetype: 'curiosity' } } as unknown as DeckItem)));
});
afterAll(() => prisma.$disconnect());

async function setup() {
  const ws = await createTestWorkspace('slideshow');
  const profile = await prisma.studioBrandProfile.create({ data: { workspaceId: ws.id, sourceUrl: 'https://example.com' } });
  const run = await prisma.studioRun.create({ data: { workspaceId: ws.id, brandProfileId: profile.id, createdBy: 'user' } });
  mocks.runId.current = run.id;
  return { workspaceId: ws.id, runId: run.id };
}

/** Saves the deck's cards as calendar ideas do (the card, with its script, in plan.card). */
const useCards = async (workspaceId: string, cards: DeckItem[]) => {
  for (const card of cards) await prisma.slideshowVariant.create({ data: { workspaceId, engine: 'website', lens: 'busy-moms', archetype: 'curiosity', plan: { card } as object } });
};

describe('Blitz Script Bank', () => {
  it('is written once, even when asked for twice at the same time', async () => {
    const { runId } = await setup();
    const [a, b] = await Promise.all([ensureBlitzBank(runId), ensureBlitzBank(runId)]);
    expect(mocks.writeBrief).toHaveBeenCalledTimes(2);
    expect(a.audiences[0]!.stories).toHaveLength(2);
    expect(b).toEqual(a);
    expect((await prisma.blitzScriptBank.findFirstOrThrow()).status).toBe('ready');
  });

  it('gives each batch the least-used story, and writes another once all were used', async () => {
    const { workspaceId } = await setup();
    const first = await bankDeck(workspaceId);
    await useCards(workspaceId, first.cards);
    await first.grow();
    const second = await bankDeck(workspaceId);
    expect(second.cards[0]!.script!.storyId).not.toBe(first.cards[0]!.script!.storyId);
    expect(mocks.writeBrief).toHaveBeenCalledTimes(2);

    await useCards(workspaceId, second.cards);
    await second.grow();
    const bank = await prisma.blitzScriptBank.findFirstOrThrow();
    expect(bank.status).toBe('ready');
    expect((bank.content as { audiences: Array<{ stories: unknown[] }> }).audiences[0]!.stories).toHaveLength(3);
    const third = await bankDeck(workspaceId);
    expect(third.cards[0]!.script!.storyId).not.toBe(first.cards[0]!.script!.storyId);
    expect(third.cards[0]!.script!.storyId).not.toBe(second.cards[0]!.script!.storyId);
  });

  it('marks a failed build so the next call writes it again', async () => {
    const { runId } = await setup();
    mocks.writeBrief.mockRejectedValue(new Error('LLM down'));
    await expect(ensureBlitzBank(runId)).rejects.toThrow('No Blitz story');
    expect((await prisma.blitzScriptBank.findFirstOrThrow()).status).toBe('failed');
    mocks.writeBrief.mockImplementation(async () => script());
    expect((await ensureBlitzBank(runId)).audiences[0]!.stories).toHaveLength(2);
  });
});
