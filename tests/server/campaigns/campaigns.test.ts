import type { Workspace } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/lib/db';
import {
  archiveCampaign, buildPlan, createDraft, getCampaign, listCampaigns,
  setPostFlags, swapCandidates, swapTemplate, updateDraft,
} from '../../../src/server/campaigns/campaigns';
import { assetGaps, scheduleCampaign, unscheduleCampaign } from '../../../src/server/campaigns/schedule';
import { getOrCreateSchedule, replanUpcoming } from '../../../src/server/calendar/calendar';
import { createTestWorkspace, ensureContentTemplates, resetBusinessTables } from '../../helpers/db';

beforeEach(async () => {
  await resetBusinessTables();
  await ensureContentTemplates();
});
afterAll(() => prisma.$disconnect());

const START = '2026-10-05';

const workspace = async (audienceType: 'b2c' | 'b2b' | 'both' = 'b2c'): Promise<Workspace> => {
  const ws = await createTestWorkspace('brand');
  return prisma.workspace.update({ where: { id: ws.id }, data: { audienceType } });
};

const draft = async (ws: Workspace, channels = ['tiktok']) => {
  const campaign = await createDraft(ws.id, { goal: 'leads', channels, startDate: START });
  return buildPlan(ws.id, campaign.id);
};

describe('campaign drafts', () => {
  it('starts empty and fills from the Template Engine', async () => {
    const ws = await workspace();
    const created = await createDraft(ws.id, { goal: 'leads', channels: ['tiktok'], startDate: START });
    expect(created.posts).toHaveLength(0);
    expect(created.status).toBe('draft');

    const planned = await buildPlan(ws.id, created.id);
    expect(planned.posts).toHaveLength(7);
    expect(planned.posts.map((p) => p.date)[0]).toBe(START);
    expect(new Set(planned.posts.map((p) => p.templateId)).size).toBe(7);
  });

  it('refuses a campaign with no channel', async () => {
    const ws = await workspace();
    await expect(createDraft(ws.id, { goal: 'leads', channels: [], startDate: START })).rejects.toThrowError(/channel/);
  });

  it('carries each day\'s real asset requirements, split from what she must supply', async () => {
    const ws = await workspace();
    const campaign = await draft(ws);
    for (const post of campaign.posts) {
      expect(post.assetRequirements.length).toBeGreaterThan(0);
      expect(post.requiredUploads.every((a) => a.required && a.fulfilment === 'upload')).toBe(true);
      expect(post.templateName).not.toBe('');
      expect(post.version).toBeGreaterThan(0);
    }
  });

  it('rebuilds the plan when the cadence changes', async () => {
    const ws = await workspace();
    const campaign = await draft(ws);
    const widened = await updateDraft(ws.id, campaign.id, { weeks: 2 });
    expect(widened.posts).toHaveLength(14);

    const perDay = await updateDraft(ws.id, campaign.id, { postsPerDay: 2 });
    expect(perDay.posts).toHaveLength(28);
  });

  it('keeps a campaign override of Brand copy out of the Brand profile', async () => {
    const ws = await prisma.workspace.update({
      where: { id: (await workspace()).id },
      data: { promoting: 'Mobile mechanic', offer: 'Same-day repairs' },
    });
    const campaign = await draft(ws);
    await updateDraft(ws.id, campaign.id, { campaignSubject: '10mm steel plate', useBrandSubject: false });

    const after = await prisma.workspace.findUniqueOrThrow({ where: { id: ws.id } });
    expect(after.promoting).toBe('Mobile mechanic');
    expect((await getCampaign(ws.id, campaign.id)).campaignSubject).toBe('10mm steel plate');
  });
});

describe('swapping a day', () => {
  it('only offers templates valid for that slot', async () => {
    const ws = await workspace();
    const campaign = await draft(ws);
    const post = campaign.posts[0]!;
    const candidates = await swapCandidates(ws.id, campaign.id, post.id);

    expect(candidates.length).toBeGreaterThan(0);
    for (const t of candidates) {
      expect(t.purposes.includes(post.purpose) || t.primaryPurpose === post.purpose).toBe(true);
      expect(t.platforms).toContain('tiktok');
      expect(['b2c', 'both']).toContain(t.audience);
    }
    // Never a template already used elsewhere in the same week.
    const used = campaign.posts.filter((p) => p.id !== post.id).map((p) => p.templateId);
    expect(candidates.some((t) => used.includes(t.id))).toBe(false);
  });

  it('rejects a template that does not fit the slot', async () => {
    const ws = await workspace();
    const campaign = await draft(ws);
    const b2bOnly = await prisma.contentTemplate.findFirstOrThrow({ where: { audience: 'b2b' } });
    await expect(swapTemplate(ws.id, campaign.id, campaign.posts[0]!.id, b2bOnly.id)).rejects.toThrowError(/does not fit/);
  });

  it('locks the swapped template\'s version onto the post', async () => {
    const ws = await workspace();
    const campaign = await draft(ws);
    const post = campaign.posts[0]!;
    const candidate = (await swapCandidates(ws.id, campaign.id, post.id))[0]!;

    const swapped = await swapTemplate(ws.id, campaign.id, post.id, candidate.id);
    const updated = swapped.posts.find((p) => p.id === post.id)!;
    expect(updated.templateId).toBe(candidate.id);
    expect(updated.versionId).toBe(candidate.versionId);
  });

  it('drops a skipped day from the counts', async () => {
    const ws = await workspace();
    const campaign = await draft(ws);
    const skipped = await setPostFlags(ws.id, campaign.id, campaign.posts[0]!.id, { skipped: true });
    expect(skipped.postCount).toBe(6);
    expect(skipped.posts).toHaveLength(7);
  });
});

describe('scheduling', () => {
  it('writes one slot per post per channel, and counts posts not slots', async () => {
    const ws = await workspace();
    const campaign = await updateDraft(ws.id, (await draft(ws, ['tiktok', 'instagram'])).id, { assetMethod: 'library' });

    expect(campaign.postCount).toBe(7);
    expect(campaign.slotCount).toBe(14);

    const scheduled = await scheduleCampaign(ws.id, campaign.id);
    expect(scheduled.status).toBe('scheduled');

    const slots = await prisma.postSlot.findMany({ where: { workspaceId: ws.id } });
    expect(slots).toHaveLength(14);
    expect(slots.every((s) => s.source === 'campaign' && s.campaignPostId !== null)).toBe(true);
    expect(new Set(slots.map((s) => s.platform))).toEqual(new Set(['tiktok', 'instagram']));
  });

  it('records template usage once, on accept', async () => {
    const ws = await workspace();
    const campaign = await draft(ws);

    expect(await prisma.templateUsage.count({ where: { workspaceId: ws.id } })).toBe(0);
    await scheduleCampaign(ws.id, campaign.id);
    const usages = await prisma.templateUsage.findMany({ where: { workspaceId: ws.id } });
    expect(usages).toHaveLength(7);
    expect(usages.every((u) => u.campaignId === campaign.id)).toBe(true);
  });

  it('flags the specific days that still need her footage', async () => {
    const ws = await workspace();
    const campaign = await draft(ws);
    const gaps = assetGaps(campaign);

    expect(gaps.length).toBeGreaterThan(0);
    for (const gap of gaps) {
      expect(gap.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(gap.templateName).not.toBe('');
      expect(gap.missing.length).toBeGreaterThan(0);
    }
    // A blanket asset method answers every day at once.
    const answered = await updateDraft(ws.id, campaign.id, { assetMethod: 'library' });
    expect(assetGaps(answered)).toHaveLength(0);
  });

  it('refuses to schedule twice, and refuses to edit a scheduled plan', async () => {
    const ws = await workspace();
    const campaign = await draft(ws);
    await scheduleCampaign(ws.id, campaign.id);

    await expect(scheduleCampaign(ws.id, campaign.id)).rejects.toThrowError(/already scheduled/);
    await expect(buildPlan(ws.id, campaign.id)).rejects.toThrowError(/already scheduled/);
  });

  it('unbooks a campaign, unless part of it is posted', async () => {
    const ws = await workspace();
    const campaign = await draft(ws);
    await scheduleCampaign(ws.id, campaign.id);

    const slot = await prisma.postSlot.findFirstOrThrow({ where: { workspaceId: ws.id } });
    await prisma.postSlot.update({ where: { id: slot.id }, data: { status: 'posted', postedAt: new Date() } });
    await expect(unscheduleCampaign(ws.id, campaign.id)).rejects.toThrowError(/already posted/);

    await prisma.postSlot.update({ where: { id: slot.id }, data: { status: 'planned', postedAt: null } });
    await unscheduleCampaign(ws.id, campaign.id);
    expect(await prisma.postSlot.count({ where: { workspaceId: ws.id } })).toBe(0);
    expect((await getCampaign(ws.id, campaign.id)).status).toBe('draft');
  });
});

describe('calendar safety', () => {
  it('changing posting weekdays never re-dates a scheduled campaign', async () => {
    const ws = await workspace();
    const campaign = await draft(ws);
    await scheduleCampaign(ws.id, campaign.id);

    const before = await prisma.postSlot.findMany({ where: { workspaceId: ws.id }, orderBy: { scheduledFor: 'asc' } });
    const schedule = await getOrCreateSchedule(ws);
    await replanUpcoming(ws, { ...schedule, weekdays: [1, 3, 5] }, new Date('2026-10-01T09:00:00Z'));

    const after = await prisma.postSlot.findMany({ where: { workspaceId: ws.id }, orderBy: { scheduledFor: 'asc' } });
    expect(after.map((s) => s.scheduledFor.toISOString())).toEqual(before.map((s) => s.scheduledFor.toISOString()));
  });
});

describe('the campaigns list', () => {
  it('shows drafts and scheduled campaigns, and hides archived ones', async () => {
    const ws = await workspace();
    const first = await draft(ws);
    const second = await createDraft(ws.id, { goal: 'sell', channels: ['instagram'], startDate: START });

    expect((await listCampaigns(ws.id)).map((c) => c.id).sort()).toEqual([first.id, second.id].sort());
    await archiveCampaign(ws.id, second.id);
    expect((await listCampaigns(ws.id)).map((c) => c.id)).toEqual([first.id]);
  });

  it('never returns another workspace\'s campaign', async () => {
    const mine = await workspace();
    const theirs = await workspace();
    const campaign = await draft(mine);
    await expect(getCampaign(theirs.id, campaign.id)).rejects.toThrowError(/not found/i);
  });
});
