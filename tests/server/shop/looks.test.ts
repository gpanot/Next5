import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { withSerializable } from '../../../src/server/db/transaction';
import { createSet } from '../../../src/server/sets/sets';
import { activate, createPendingSubscription } from '../../../src/server/subscriptions/subscriptions';
import { createTestWorkspace, resetBusinessTables } from '../../helpers/db';

beforeEach(resetBusinessTables);
afterAll(() => prisma.$disconnect());

describe('shop models', () => {
  it('keeps one row per model: adding a model she already has returns it', async () => {
    const ws = await createTestWorkspace('shop');
    await withSerializable(async (tx) => {
      const sub = await createPendingSubscription(tx, { workspaceId: ws.id, planId: 'shop_starter', termMonths: 12 });
      return activate(tx, sub.id, new Date());
    });
    const first = await createSet(ws, { modelRef: 'me' });
    const again = await createSet(ws, { modelRef: 'me' });

    expect(again.id).toBe(first.id);
    expect(first.name).toBe('You');
    const count = await prisma.studioSet.count({ where: { workspaceId: ws.id, status: { not: 'archived' } } });
    expect(count).toBe(1);
  });
});
