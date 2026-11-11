/**
 * Target client: the age bucket read from a site's range, the cast writer following the owner's pick, and the hard stop
 * after step 3 (exactly one of the pipeline and the pick goes on with a waiting run). No DB, no OpenAI.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = {
  autoSlideshowRun: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), updateMany: vi.fn() },
  workspace: { findUnique: vi.fn() },
};
vi.mock('../../../src/lib/db', () => ({ prisma: db }));
const creativeJson = vi.fn();
vi.mock('../../../src/server/shorts/llm', () => ({ smartModel: () => 'gpt-6.1-sol', creativeJson: (...args: unknown[]) => creativeJson(...args) }));

const { targetAgeOf } = await import('../../../src/types/admin/targetClient');
const { writePersonas } = await import('../../../src/server/brandCast/personas');
const { holdForTarget } = await import('../../../src/server/autoSlideshow/targetClient');

const meter = { add: vi.fn(), summary: vi.fn() } as never;
const profile = { brandName: 'Glow', domain: 'glow.com', valueProp: 'Day spa', audience: 'Moms 30-45', tone: 'warm' } as never;

describe('targetAgeOf', () => {
  it('picks the bucket holding the middle of the range', () => {
    expect(targetAgeOf('20-55')).toBe('30_40');
    expect(targetAgeOf('22-28')).toBe('20_30');
    expect(targetAgeOf('40-55')).toBe('40_50');
    expect(targetAgeOf('55+')).toBe('50_plus');
  });
  it('is null without an age', () => {
    expect(targetAgeOf('none')).toBeNull();
    expect(targetAgeOf(null)).toBeNull();
  });
});

describe('writePersonas with a target client', () => {
  beforeEach(() => creativeJson.mockReset());

  it('casts in the picked range and gender, and keeps written ages inside it', async () => {
    creativeJson.mockResolvedValue({ person_1_name: 'Rob', person_1_age: 31, person_1_look: 'a man with grey hair, fit build' });
    const [p] = await writePersonas({ profile, bible: null, products: [], outfits: [], target: { age: '50_plus', gender: 'male' } }, 1, [], meter);
    const [system, user] = creativeJson.mock.calls[0]!;
    expect(system).toContain('between 50 and 60');
    expect(user).toContain("TARGET CLIENT (the owner's pick, it wins over AUDIENCE): men, aged 50+. Cast: every person is a man, aged 50-60.");
    expect(p!.name).toBe('Rob, 50');
  });

  it('keeps the default range without a pick', async () => {
    creativeJson.mockResolvedValue({ person_1_name: 'Maya', person_1_age: 55, person_1_look: 'a woman, fit build' });
    const [p] = await writePersonas({ profile, bible: null, products: [], outfits: [], target: null }, 1, [], meter);
    expect(creativeJson.mock.calls[0]![1]).not.toContain('TARGET CLIENT');
    expect(p!.name).toBe('Maya, 42');
  });
});

describe('holdForTarget', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    db.autoSlideshowRun.findUnique.mockResolvedValue({ waitForTarget: true, workspaceId: 'w1' });
    db.autoSlideshowRun.findUniqueOrThrow.mockResolvedValue({ workspaceId: 'w1' });
  });

  it('does not hold a run that does not wait', async () => {
    db.autoSlideshowRun.findUnique.mockResolvedValue({ waitForTarget: false, workspaceId: 'w1' });
    expect(await holdForTarget('r1')).toBe(false);
    expect(db.autoSlideshowRun.updateMany).not.toHaveBeenCalled();
  });

  it('does not hold once the owner picked', async () => {
    db.workspace.findUnique.mockResolvedValue({ targetConfirmedAt: new Date() });
    expect(await holdForTarget('r1')).toBe(false);
  });

  it('holds while nothing is picked', async () => {
    db.workspace.findUnique.mockResolvedValue({ targetConfirmedAt: null });
    db.autoSlideshowRun.updateMany.mockResolvedValue({ count: 1 });
    expect(await holdForTarget('r1')).toBe(true);
    expect(db.autoSlideshowRun.updateMany).toHaveBeenCalledWith({ where: { id: 'r1', status: 'STEP_3_RUNNING' }, data: { status: 'WAITING_TARGET' } });
  });

  it('goes on itself when the pick landed during the hold and did not take the run', async () => {
    db.workspace.findUnique.mockResolvedValueOnce({ targetConfirmedAt: null }).mockResolvedValueOnce({ targetConfirmedAt: new Date() });
    db.autoSlideshowRun.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });
    expect(await holdForTarget('r1')).toBe(false);
  });

  it('stops when the pick already took the run', async () => {
    db.workspace.findUnique.mockResolvedValueOnce({ targetConfirmedAt: null }).mockResolvedValueOnce({ targetConfirmedAt: new Date() });
    db.autoSlideshowRun.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    expect(await holdForTarget('r1')).toBe(true);
  });
});
