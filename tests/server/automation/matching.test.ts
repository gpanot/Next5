import type { Workspace } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { WEEKLY_RHYTHMS } from '../../../src/config/contentTemplates';
import { prisma } from '../../../src/lib/db';
import { proposePlan, recordUsage } from '../../../src/server/automation/matching';
import { createTestWorkspace, ensureContentTemplates, resetBusinessTables } from '../../helpers/db';

beforeEach(async () => {
  await resetBusinessTables();
  await ensureContentTemplates();
});
afterAll(() => prisma.$disconnect());

const START = '2026-10-05'; // a Monday

const workspaceFor = async (audienceType: 'b2c' | 'b2b' | 'both'): Promise<Workspace> => {
  const ws = await createTestWorkspace('brand');
  return prisma.workspace.update({ where: { id: ws.id }, data: { audienceType } });
};

describe('proposePlan', () => {
  it('fills one slot per day for a week, following the goal rhythm', async () => {
    const ws = await workspaceFor('b2c');
    const plan = await proposePlan({ workspaceId: ws.id, goal: 'leads', channels: ['tiktok'], startDate: START });

    expect(plan).toHaveLength(7);
    expect(plan.map((s) => s.purpose)).toEqual([...WEEKLY_RHYTHMS.leads]);
    expect(plan.map((s) => s.date)).toEqual([
      '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11',
    ]);
    expect(new Set(plan.map((s) => s.templateId)).size).toBe(7);
  });

  it('never leaves a slot empty for any audience on any goal', async () => {
    for (const audience of ['b2c', 'b2b', 'both'] as const) {
      const ws = await workspaceFor(audience);
      for (const goal of ['leads', 'enquiries', 'sell'] as const) {
        const plan = await proposePlan({ workspaceId: ws.id, goal, channels: ['tiktok', 'instagram'], startDate: START });
        expect(plan, `${audience}/${goal}`).toHaveLength(7);
        expect(plan.every((s) => s.templateId && s.versionId), `${audience}/${goal}`).toBe(true);
      }
    }
  });

  it('every slot carries the template version and its asset requirements', async () => {
    const ws = await workspaceFor('both');
    const plan = await proposePlan({ workspaceId: ws.id, goal: 'leads', channels: ['tiktok'], startDate: START });

    for (const slot of plan) {
      expect(slot.version).toBeGreaterThan(0);
      expect(slot.assetRequirements.length).toBeGreaterThan(0);
      expect(slot.assetRequirements.every((a) => a.label.length > 0)).toBe(true);
      expect(slot.requiredUploads.every((a) => a.required && a.fulfilment === 'upload')).toBe(true);
    }
  });

  it('keeps B2B-only templates away from a B2C business', async () => {
    const b2c = await workspaceFor('b2c');
    const plan = await proposePlan({ workspaceId: b2c.id, goal: 'sell', channels: ['tiktok', 'instagram'], weeks: 4, startDate: START });

    const b2bOnly = await prisma.contentTemplate.findMany({ where: { audience: 'b2b' }, select: { id: true } });
    expect(b2bOnly.length).toBeGreaterThan(0);
    const b2bIds = new Set(b2bOnly.map((t) => t.id));
    expect(plan.some((s) => b2bIds.has(s.templateId))).toBe(false);
  });

  it('prefers a workspace override over the global template it was cloned from', async () => {
    const ws = await workspaceFor('b2c');
    const global = await prisma.contentTemplate.findFirstOrThrow({
      where: { workspaceId: null, primaryPurpose: 'awareness', status: 'active' },
      include: { activeVersion: { include: { variables: true, assetRequirements: true } } },
    });
    const version = global.activeVersion!;

    const override = await prisma.contentTemplate.create({
      data: {
        slug: `${global.slug}-${ws.id}`,
        name: `${global.name} (override)`,
        pillarId: global.pillarId,
        formatSlug: global.formatSlug,
        audience: global.audience,
        platforms: global.platforms,
        purposes: global.purposes,
        primaryPurpose: global.primaryPurpose,
        status: 'active',
        workspaceId: ws.id,
        parentTemplateId: global.id,
        versions: {
          create: {
            version: 1,
            hookPattern: version.hookPattern,
            beats: version.beats ?? [],
            suggestedSlides: version.suggestedSlides ?? [],
            keywords: version.keywords,
            assetRequirements: { create: version.assetRequirements.map(({ kind, required, minCount, fulfilment, notes }) => ({ kind, required, minCount, fulfilment, notes })) },
          },
        },
      },
      include: { versions: true },
    });
    await prisma.contentTemplate.update({ where: { id: override.id }, data: { activeVersionId: override.versions[0]!.id } });

    const plan = await proposePlan({ workspaceId: ws.id, goal: 'leads', channels: ['tiktok'], startDate: START });
    expect(plan.some((s) => s.templateId === override.id)).toBe(true);
    expect(plan.some((s) => s.templateId === global.id)).toBe(false);
  });

  it('rotates away from templates proposed in the previous week', async () => {
    const ws = await workspaceFor('b2c');
    const week1 = await proposePlan({ workspaceId: ws.id, goal: 'leads', channels: ['tiktok'], startDate: START });
    await recordUsage(ws.id, week1);

    const week2 = await proposePlan({ workspaceId: ws.id, goal: 'leads', channels: ['tiktok'], startDate: '2026-10-12' });
    const repeated = week2.filter((s) => week1.some((w) => w.templateId === s.templateId));
    expect(repeated.length).toBeLessThan(week2.length);
  });

  it('bends a purpose before repeating an idea inside one week', async () => {
    // The `sell` rhythm asks for conversion three times, and few B2C templates serve it.
    // Three different ideas, one slightly off-purpose, beats the same pledge video three times.
    const ws = await workspaceFor('b2c');
    const plan = await proposePlan({ workspaceId: ws.id, goal: 'sell', channels: ['tiktok'], startDate: START });

    expect(new Set(plan.map((s) => s.templateId)).size).toBe(plan.length);
    expect(plan.some((s) => s.widened)).toBe(true);
  });

  it('is deterministic — the same input produces the same plan', async () => {
    const ws = await workspaceFor('both');
    const a = await proposePlan({ workspaceId: ws.id, goal: 'enquiries', channels: ['tiktok'], startDate: START });
    const b = await proposePlan({ workspaceId: ws.id, goal: 'enquiries', channels: ['tiktok'], startDate: START });
    expect(a.map((s) => s.templateSlug)).toEqual(b.map((s) => s.templateSlug));
  });

  it('skips templates that require an asset the business cannot supply', async () => {
    const ws = await workspaceFor('both');
    const plan = await proposePlan({
      workspaceId: ws.id, goal: 'leads', channels: ['tiktok'], weeks: 4, startDate: START,
      unavailableAssets: ['location_footage'],
    });
    for (const slot of plan) {
      expect(slot.assetRequirements.some((a) => a.required && a.kind === 'location_footage')).toBe(false);
    }
  });

  it('expands posts-per-day into the day\'s posting slots', async () => {
    const ws = await workspaceFor('both');
    const plan = await proposePlan({ workspaceId: ws.id, goal: 'leads', channels: ['tiktok'], postsPerDay: 3, startDate: START });

    expect(plan).toHaveLength(21);
    const firstDay = plan.filter((s) => s.dayIndex === 0);
    expect(firstDay.map((s) => s.slotOfDay)).toEqual(['morning', 'midday', 'evening']);
    expect(new Set(firstDay.map((s) => s.templateId)).size).toBe(3);
  });

  it('sends one piece of content to every campaign channel, not one channel per day', async () => {
    const ws = await workspaceFor('both');
    const plan = await proposePlan({ workspaceId: ws.id, goal: 'leads', channels: ['tiktok', 'instagram'], startDate: START });

    expect(plan).toHaveLength(7);
    for (const slot of plan) {
      expect(slot.platforms).toEqual(['tiktok', 'instagram']);
    }
  });

  it('drops a channel the assigned template does not support', async () => {
    const ws = await workspaceFor('both');
    await prisma.contentTemplate.updateMany({ where: { slug: 'the-insider-reveal' }, data: { platforms: ['tiktok'] } });
    await prisma.contentTemplate.updateMany({ where: { legacyId: 2 }, data: { platforms: ['tiktok'] } });

    const plan = await proposePlan({ workspaceId: ws.id, goal: 'leads', channels: ['tiktok', 'instagram'], startDate: START });
    const restricted = plan.find((s) => s.templateSlug === 'insider-reveal');
    expect(restricted?.platforms).toEqual(['tiktok']);
  });

  it('only proposes templates whose platforms include a campaign channel', async () => {
    const ws = await workspaceFor('both');
    await prisma.contentTemplate.updateMany({ where: { slug: 'n-red-flags' }, data: { platforms: ['instagram'] } });
    const plan = await proposePlan({ workspaceId: ws.id, goal: 'leads', channels: ['tiktok'], weeks: 4, startDate: START });
    expect(plan.some((s) => s.templateSlug === 'n-red-flags')).toBe(false);
  });
});
