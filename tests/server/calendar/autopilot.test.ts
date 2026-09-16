import type { Workspace } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { enableAfterFirstBatch, hasGoneQuiet, missingSlots, runAutopilotFor, runDueAutopilot } from '../../../src/server/calendar/autopilot';
import { getOrCreateSchedule, parseScheduleInput, saveSchedule } from '../../../src/server/calendar/calendar';
import { grant } from '../../../src/server/credits/ledger';
import { withSerializable } from '../../../src/server/db/transaction';
import { activate, createPendingSubscription } from '../../../src/server/subscriptions/subscriptions';
import { at, createTestWorkspace, resetBusinessTables } from '../../helpers/db';

beforeEach(resetBusinessTables);
afterAll(() => prisma.$disconnect());

const NOW = at('2026-09-15T09:00:00Z'); // a Tuesday

/**
 * A paid workspace with a set and a theme. Activating the plan grants its monthly credits,
 * so `plan` here replaces that allowance outright — that is what we are testing against.
 */
const readyWorkspace = async (credits: { plan?: number; topup?: number } = {}) => {
  const ws = await createTestWorkspace('brand');
  await withSerializable(async (tx) => {
    const sub = await createPendingSubscription(tx, { workspaceId: ws.id, planId: 'brand_pro', termMonths: 1 });
    await activate(tx, sub.id, NOW);
    if (credits.topup) await grant(tx, { workspaceId: ws.id, bucket: 'topup', amount: credits.topup, reason: 'topup_grant', refType: 'test', refId: 'topup', expiresAt: at('2026-12-15T00:00:00Z') });
  });
  if (credits.plan !== undefined) {
    await prisma.creditLedger.deleteMany({ where: { workspaceId: ws.id, bucket: 'plan' } });
    if (credits.plan > 0) {
      await withSerializable((tx) =>
        grant(tx, { workspaceId: ws.id, bucket: 'plan', amount: credits.plan!, reason: 'plan_grant', refType: 'test', refId: 'plan', expiresAt: at('2026-10-15T00:00:00Z') }),
      );
    }
  }
  const template = await prisma.setTemplate.findFirstOrThrow();
  await prisma.studioSet.create({ data: { workspaceId: ws.id, templateId: template.id, name: 'My set', locations: [], status: 'active' } });
  await prisma.identityReference.create({ data: { workspaceId: ws.id, kind: 'face', r2Key: 'face.jpg' } });
  return ws;
};

const withAutopilot = async (ws: Workspace) => {
  await getOrCreateSchedule(ws);
  return saveSchedule(ws, parseScheduleInput({ weekdays: [2, 4, 6], autopilot: true, platform: 'instagram' }), NOW);
};

describe('missingSlots', () => {
  it('counts the posting days in the buffer that hold no photo', async () => {
    const ws = await createTestWorkspace('brand');
    const schedule = await getOrCreateSchedule(ws);
    // Tue/Thu/Sat over a fortnight from Tue the 15th.
    expect(await missingSlots(schedule, NOW)).toBe(6);

    await prisma.postSlot.create({ data: { workspaceId: ws.id, scheduleId: schedule.id, scheduledFor: new Date('2026-09-17T00:00:00Z') } });
    expect(await missingSlots(schedule, NOW)).toBe(5);
  });
});

describe('runAutopilotFor', () => {
  it('makes just enough photos to refill the fortnight', async () => {
    const ws = await readyWorkspace();
    const schedule = await withAutopilot(ws);
    expect(await runAutopilotFor(ws, schedule, NOW)).toBe(6);

    const batch = await prisma.batch.findFirstOrThrow({ where: { workspaceId: ws.id } });
    expect(batch.kind).toBe('brand_theme');
    expect(await prisma.batchItem.count({ where: { batchId: batch.id } })).toBe(6);
  });

  it('spends her monthly allowance and never a top-up she bought', async () => {
    const ws = await readyWorkspace({ plan: 2, topup: 50 });
    const schedule = await withAutopilot(ws);
    // Six days need photos, but only two allowance credits are left.
    expect(await runAutopilotFor(ws, schedule, NOW)).toBe(2);
  });

  it('does nothing with no allowance left, however big the top-up', async () => {
    const ws = await readyWorkspace({ plan: 0, topup: 50 });
    const schedule = await withAutopilot(ws);
    expect(await runAutopilotFor(ws, schedule, NOW)).toBe(0);
    expect(await prisma.batch.count({ where: { workspaceId: ws.id } })).toBe(0);
  });

  it('does nothing without a paid plan, and nothing when the buffer is full', async () => {
    const free = await createTestWorkspace('brand');
    expect(await runAutopilotFor(free, await withAutopilot(free), NOW)).toBe(0);

    const ws = await readyWorkspace();
    const schedule = await withAutopilot(ws);
    await runAutopilotFor(ws, schedule, NOW);
    // The slots are not filled yet, but the photos are on their way — so a second run is still due.
    expect(await missingSlots(schedule, NOW)).toBe(6);
  });
});

describe('the churn alarm', () => {
  it('spots a member who has stopped posting', async () => {
    const ws = await createTestWorkspace('brand');
    const schedule = await getOrCreateSchedule(ws);
    expect(await hasGoneQuiet(ws.id, NOW)).toBe(false);

    for (const day of ['2026-08-10', '2026-08-12', '2026-08-14', '2026-08-16']) {
      await prisma.postSlot.create({ data: { workspaceId: ws.id, scheduleId: schedule.id, scheduledFor: new Date(`${day}T00:00:00Z`) } });
    }
    expect(await hasGoneQuiet(ws.id, NOW)).toBe(true);

    // One post inside the fortnight and she is active again.
    await prisma.postSlot.create({
      data: { workspaceId: ws.id, scheduleId: schedule.id, scheduledFor: new Date('2026-09-12T00:00:00Z'), status: 'posted', postedAt: at('2026-09-12T10:00:00Z') },
    });
    expect(await hasGoneQuiet(ws.id, NOW)).toBe(false);
  });

  it('pauses autopilot instead of spending on her', async () => {
    const ws = await readyWorkspace();
    const schedule = await withAutopilot(ws);
    for (const day of ['2026-08-10', '2026-08-12', '2026-08-14', '2026-08-16']) {
      await prisma.postSlot.create({ data: { workspaceId: ws.id, scheduleId: schedule.id, scheduledFor: new Date(`${day}T00:00:00Z`) } });
    }
    expect(await runDueAutopilot(NOW)).toBe(0);
    expect((await prisma.postSchedule.findUniqueOrThrow({ where: { id: schedule.id } })).pausedAt).not.toBeNull();
    expect(await prisma.batch.count({ where: { workspaceId: ws.id } })).toBe(0);
  });
});

describe('enableAfterFirstBatch', () => {
  it('turns autopilot on once she has made a batch herself', async () => {
    const ws = await createTestWorkspace('brand');
    const schedule = await getOrCreateSchedule(ws);
    expect(schedule.autopilot).toBe(false);

    await enableAfterFirstBatch(ws.id, NOW);
    expect((await prisma.postSchedule.findUniqueOrThrow({ where: { id: schedule.id } })).autopilot).toBe(true);
  });

  it('respects her own choice once she has changed her settings', async () => {
    const ws = await createTestWorkspace('brand');
    await getOrCreateSchedule(ws);
    await saveSchedule(ws, parseScheduleInput({ weekdays: [1], autopilot: false, platform: 'instagram' }), NOW);

    await enableAfterFirstBatch(ws.id, NOW);
    expect((await prisma.postSchedule.findUniqueOrThrow({ where: { workspaceId: ws.id } })).autopilot).toBe(false);
  });
});
