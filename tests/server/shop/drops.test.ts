import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { withSerializable } from '../../../src/server/db/transaction';
import { nextRunAfter, parseDropInput, pickDropProducts, runDueDrops, saveDropSchedule } from '../../../src/server/shop/drops';
import { activate, createPendingSubscription } from '../../../src/server/subscriptions/subscriptions';
import { at, createTestWorkspace, resetBusinessTables } from '../../helpers/db';

beforeEach(resetBusinessTables);
afterAll(() => prisma.$disconnect());

const input = parseDropInput({ active: true, cadence: 'weekly', weekday: 1, productsPerDrop: 5, packId: 'listing', formats: ['square_1_1', 'story_9_16'] });

describe('drop schedule', () => {
  it('computes the next run on the chosen weekday at 01:00 UTC', () => {
    expect(nextRunAfter(at('2026-09-16T10:00:00Z'), 1).toISOString()).toBe('2026-09-21T01:00:00.000Z'); // Wed → Mon
    expect(nextRunAfter(at('2026-09-21T00:30:00Z'), 1).toISOString()).toBe('2026-09-21T01:00:00.000Z'); // same Monday, before 01:00
    expect(nextRunAfter(at('2026-09-21T01:00:00Z'), 1).toISOString()).toBe('2026-09-28T01:00:00.000Z');
    expect(() => parseDropInput({ weekday: 9, productsPerDrop: 5, formats: ['square_1_1'] })).toThrow(/day of the week/);
  });

  it('needs Growth, picks new stock first then best sellers, emails once and skips photographed products', async () => {
    const ws = await createTestWorkspace('shop');
    await expect(saveDropSchedule(ws, input, at('2026-09-16T10:00:00Z'))).rejects.toMatchObject({ status: 403 });
    await withSerializable(async (tx) => {
      const sub = await createPendingSubscription(tx, { workspaceId: ws.id, planId: 'shop_pro', termMonths: 1 });
      return activate(tx, sub.id, at('2026-09-16T00:00:00Z'));
    });
    const mk = (name: string, soldCount: number | null, importedAt: string) =>
      prisma.product.create({ data: { workspaceId: ws.id, name, category: 'top', frontR2Key: `ws/${ws.id}/${name}.jpg`, soldCount, importedAt: at(importedAt), createdAt: at(importedAt) } });
    await mk('old best seller', 900, '2026-09-01T00:00:00Z');
    await mk('old slow', 3, '2026-09-01T00:00:00Z');
    await mk('new arrival', null, '2026-09-20T00:00:00Z');
    await prisma.product.create({ data: { workspaceId: ws.id, name: 'still downloading', category: 'top', frontR2Key: '' } });

    const saved = await saveDropSchedule(ws, input, at('2026-09-16T10:00:00Z'));
    expect(saved.nextRunAt?.toISOString()).toBe('2026-09-21T01:00:00.000Z');
    await prisma.dropSchedule.update({ where: { id: saved.id }, data: { lastRunAt: at('2026-09-14T01:00:00Z') } });

    expect((await pickDropProducts(ws.id, 5, at('2026-09-14T01:00:00Z'))).map((p) => p.name)).toEqual(['new arrival', 'old best seller', 'old slow']);
    expect(await runDueDrops(at('2026-09-21T02:00:00Z'))).toBe(1);
    expect(await runDueDrops(at('2026-09-21T03:00:00Z'))).toBe(0); // not due again until next week
    const after = await prisma.dropSchedule.findUniqueOrThrow({ where: { id: saved.id } });
    expect(after.lastProductIds).toHaveLength(3);
    expect(after.nextRunAt?.toISOString()).toBe('2026-09-28T01:00:00.000Z');
    expect(await prisma.emailLog.count({ where: { template: 'drop_ready' } })).toBe(1);
  });
});
