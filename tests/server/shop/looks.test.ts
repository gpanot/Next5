import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { withSerializable } from '../../../src/server/db/transaction';
import { createSet } from '../../../src/server/sets/sets';
import { activate, createPendingSubscription } from '../../../src/server/subscriptions/subscriptions';
import { createTestWorkspace, resetBusinessTables } from '../../helpers/db';

beforeEach(resetBusinessTables);
afterAll(() => prisma.$disconnect());

describe('shop looks', () => {
  it('lets a workspace keep as many looks as it wants, whatever the plan', async () => {
    const ws = await createTestWorkspace('shop');
    await withSerializable(async (tx) => {
      const sub = await createPendingSubscription(tx, { workspaceId: ws.id, planId: 'shop_starter', termMonths: 12 });
      return activate(tx, sub.id, new Date());
    });
    const template = await prisma.setTemplate.findFirstOrThrow({ where: { product: 'shop', isActive: true } });
    for (let i = 0; i < 12; i += 1) await createSet(ws, { templateId: template.id, name: `Look ${i}`, modelRef: 'me' });

    const count = await prisma.studioSet.count({ where: { workspaceId: ws.id, status: { not: 'archived' } } });
    expect(count).toBe(12);
  });
});
