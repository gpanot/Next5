import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { bankDeck, ensureBlitzBank, pickHook, pickScripts, type BlitzBankContent } from '../../../src/server/labs/blitzBank';
import { STAGE_TARGET, WEEK_MIX } from '../../../src/server/labs/blitzFormats';
import type { BriefScript } from '../../../src/server/labs/websiteDeck';
import type { DeckItem } from '../../../src/server/slideshow/core/deckAssembly';
import { createTestWorkspace, resetBusinessTables } from '../../helpers/db';

const mocks = vi.hoisted(() => ({ writeBrief: vi.fn(), deckFromScripts: vi.fn(), writeTriggers: vi.fn(), writeTriggerBank: vi.fn(), runId: { current: '' } }));
vi.mock('../../../src/server/labs/blitzCampaign', () => ({ writeTriggerBank: mocks.writeTriggerBank }));
vi.mock('../../../src/server/labs/blitzTriggers', () => ({ writeTriggers: mocks.writeTriggers }));
vi.mock('../../../src/server/labs/websiteDeck', () => ({
  writeBrief: mocks.writeBrief,
  deckFromScripts: mocks.deckFromScripts,
  loadWebsiteSource: async () => ({ profile: {}, sourceUrl: 'https://example.com', workspaceId: null }),
}));
vi.mock('../../../src/server/slideshow/engines/website/engine', () => ({
  websiteEngine: { briefs: () => [{ idc: 'Busy moms', tone: 'casual', proofPoints: [] }] },
}));
vi.mock('../../../src/server/labs/workspaceRun', () => ({ workspaceRunId: async () => mocks.runId.current }));

let written = 0;
const script = (): BriefScript => {
  written += 1;
  return {
    idc: 'Busy moms', categories: ['family'], tone: 'casual', proofNote: '', slot: 0,
    story: { pain: `Pain case${written}`, oldWay: 'o', mechanism: 'm', proof: 'p', inaction: 'i', cta: 'c' },
    hooks: [{ archetype: 'curiosity', text: `hook ${written}` }],
  };
};

beforeEach(async () => {
  await resetBusinessTables();
  await prisma.slideshowVariant.deleteMany({});
  await prisma.blitzScriptBank.deleteMany({});
  written = 0;
  mocks.writeBrief.mockReset().mockImplementation(async () => script());
  mocks.writeTriggerBank.mockReset().mockResolvedValue({
    goal: { objective: 'More trials', action: 'Start a free trial' },
    triggers: { pains: ['pain a', 'pain b'], desires: ['desire a'], questions: [], objections: ['doubt a'], myths: ['myth a'], reasons: [] },
  });
  mocks.writeTriggers.mockReset().mockImplementation(async (_brief: unknown, formats: string[]) => formats.map((f, i) => `${f} trigger ${i}`));
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

const TARGET = Object.values(STAGE_TARGET).reduce((n, v) => n + v, 0);
const WEEKS = [WEEK_MIX[0]!, WEEK_MIX[1]!];
const MIX_TOTAL = WEEKS.reduce((n, w) => n + Object.values(w).reduce((m, v) => m + v, 0), 0);
type StoredStory = { id: string; stage?: string; format?: string; trigger?: string };
const storiesOf = (content: unknown) => (content as { audiences: Array<{ stories: StoredStory[] }> }).audiences[0]!.stories;

// These write a full bank (20 stories) through the test database: slower than the default 5 s under a full run.
describe('Blitz Script Bank', { timeout: 20_000 }, () => {
  it('is written once, each stage\'s stories in its formats from their own triggers, even when asked for twice', async () => {
    const { runId } = await setup();
    const [a, b] = await Promise.all([ensureBlitzBank(runId), ensureBlitzBank(runId)]);
    expect(mocks.writeTriggerBank).toHaveBeenCalledTimes(1);
    expect(mocks.writeBrief).toHaveBeenCalledTimes(TARGET);
    const stories = storiesOf(a);
    expect(stories).toHaveLength(TARGET);
    expect(stories.filter((s) => s.stage === 'trust').map((s) => s.format).sort()).toEqual(['how_to', 'how_to', 'how_to', 'signs', 'signs']);
    expect(stories.filter((s) => s.stage === 'conversion').map((s) => s.format).sort()).toEqual(['objection', 'objection', 'offer', 'offer']);
    const briefs = mocks.writeBrief.mock.calls.map((c) => c[0] as { problem?: string; ctaRule?: string; storyBeats?: string[] });
    expect(briefs.map((x) => x.problem)).toEqual(expect.arrayContaining(['pain a', 'pain b', 'myth a', 'desire a', 'doubt a']));
    expect(briefs.filter((x) => x.problem === 'pain a')).toHaveLength(1);
    expect(mocks.writeTriggers.mock.calls[0]![2]).toEqual(expect.arrayContaining(['pain a', 'myth a']));
    expect(a.audiences[0]).toMatchObject({ goal: { action: 'Start a free trial' } });
    expect(briefs.every((x) => x.ctaRule && x.storyBeats?.length === 5)).toBe(true);
    expect(b).toEqual(a);
    expect((await prisma.blitzScriptBank.findFirstOrThrow()).status).toBe('ready');
  });

  it('gives a batch its stage quota, one card per story, never one already used, and tops up after', async () => {
    const { workspaceId } = await setup();
    const first = await bankDeck(workspaceId, WEEKS);
    const scripts = mocks.deckFromScripts.mock.calls[0]![1] as BriefScript[];
    expect(scripts).toHaveLength(MIX_TOTAL);
    expect(scripts.slice(0, 7).filter((x) => x.stage === 'attention')).toHaveLength(WEEKS[0]!.attention);
    expect(scripts.slice(7).filter((x) => x.stage === 'trust')).toHaveLength(WEEKS[1]!.trust);
    expect(scripts.slice(0, 2).some((x) => x.stage === 'conversion')).toBe(false);
    const firstIds = first.cards.map((c) => c.script!.storyId);
    expect(new Set(firstIds).size).toBe(MIX_TOTAL);
    await useCards(workspaceId, first.cards);
    await first.grow();
    const bank = await prisma.blitzScriptBank.findFirstOrThrow();
    expect(bank.status).toBe('ready');
    const unused = storiesOf(bank.content).filter((s) => !firstIds.includes(s.id));
    expect(unused).toHaveLength(TARGET);
    const second = await bankDeck(workspaceId, [WEEK_MIX[2]!, WEEK_MIX[3]!]);
    expect(second.cards.map((c) => c.script!.storyId).filter((id) => firstIds.includes(id))).toEqual([]);
  });

  it('writes a stage\'s missing stories before a batch that needs them (older banks have no stages)', async () => {
    const { workspaceId, runId } = await setup();
    const old = { audiences: [{ idc: 'Busy moms', categories: [], tone: 'casual', proofNote: '', slot: 0, stories: [{ id: 'old-1', story: script().story, hooks: script().hooks }] }] };
    await prisma.blitzScriptBank.create({ data: { brandProfileId: (await prisma.studioRun.findUniqueOrThrow({ where: { id: runId } })).brandProfileId, status: 'ready', content: old } });
    const deck = await bankDeck(workspaceId, WEEKS);
    expect(deck.cards).toHaveLength(MIX_TOTAL);
    expect(deck.cards.map((c) => c.script!.storyId)).toContain('old-1');
  });

  it('writes follow-ups of a winner (its trigger, later stages) once its video beats the median', async () => {
    const { workspaceId, runId } = await setup();
    const content = await ensureBlitzBank(runId);
    const stories = storiesOf(content);
    const posted = [stories[0]!, stories[1]!, stories[2]!];
    for (const [i, s] of posted.entries()) {
      const card = { id: 'x', variantId: null, script: { storyId: s.id, archetype: 'curiosity', format: s.format, stage: s.stage } };
      await prisma.slideshowVariant.create({ data: { workspaceId, engine: 'website', lens: 'busy-moms', archetype: 'curiosity', status: 'made', plan: { card, stats: { views: [9000, 1000, 900][i], readAt: new Date().toISOString() } } as object } });
    }
    mocks.writeBrief.mockClear();
    const deck = await bankDeck(workspaceId, [WEEK_MIX[2]!, WEEK_MIX[3]!]);
    await deck.grow();
    const winner = posted[0]!;
    const followUps = storiesOf((await prisma.blitzScriptBank.findFirstOrThrow()).content).filter((s) => (s as { followUpOf?: string }).followUpOf === winner.id);
    expect(followUps.length).toBeGreaterThan(0);
    expect(followUps.every((s) => s.stage !== winner.stage && s.trigger === winner.trigger)).toBe(true);
  });

  it('marks a failed build so the next call writes it again', async () => {
    const { runId } = await setup();
    mocks.writeBrief.mockRejectedValue(new Error('LLM down'));
    await expect(ensureBlitzBank(runId)).rejects.toThrow('No Blitz story');
    expect((await prisma.blitzScriptBank.findFirstOrThrow()).status).toBe('failed');
    mocks.writeBrief.mockImplementation(async () => script());
    expect(storiesOf(await ensureBlitzBank(runId))).toHaveLength(TARGET);
  });
});

describe('pickHook / pickScripts', () => {
  const hooks = [
    { archetype: 'call_out' as const, text: 'Families, know dinner before it starts' },
    { archetype: 'fear_inaction' as const, text: 'Dinner starts, and the rice is gone' },
    { archetype: 'curiosity' as const, text: 'How pantry tracking keeps rice ready' },
  ];
  const pain = 'Dinner starts, and the rice is already gone';

  it('takes the wanted hook type and never leads with a hook that repeats the pain', () => {
    expect(pickHook(hooks, pain, 'curiosity')!.archetype).toBe('curiosity');
    expect(pickHook(hooks, pain, 'fear_inaction')!.archetype).not.toBe('fear_inaction');
  });

  it('fills each stage quota with least-used stories, short stages from the others, one hook each', () => {
    const story = (id: string, stage?: 'trust' | 'conversion') => ({ id, story: { pain: `pain ${id}`, oldWay: 'o', mechanism: 'm', proof: 'p', inaction: 'i', cta: 'c' }, hooks, ...(stage ? { stage } : {}) });
    const audience = (idc: string, slot: number, stories: ReturnType<typeof story>[]) => ({ idc, categories: [], tone: 'casual' as const, proofNote: '', slot, stories });
    const content: BlitzBankContent = { audiences: [audience('A', 0, [story('a1'), story('a2'), story('t1', 'trust')]), audience('B', 1, [story('b1'), story('c1', 'conversion')])] };
    const scripts = pickScripts(content, new Map([['a1', 2]]), [{ attention: 2, trust: 1, proof: 1, conversion: 1 }]);
    expect(scripts).toHaveLength(5);
    expect(new Set(scripts.map((x) => x.storyId))).toEqual(new Set(['a2', 'b1', 't1', 'c1', 'a1']));
    expect(scripts[0]!.stage).not.toBe('conversion');
    expect(scripts[0]!.hooks).toHaveLength(1);
    expect(scripts[0]!.otherHooks).toHaveLength(2);
  });
});
