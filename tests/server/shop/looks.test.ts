import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PLANS } from '../../../src/config/plans';
import { prisma } from '../../../src/lib/db';
import { withSerializable } from '../../../src/server/db/transaction';
import { createSet } from '../../../src/server/sets/sets';
import { activate, createPendingSubscription } from '../../../src/server/subscriptions/subscriptions';
import { createTestWorkspace, resetBusinessTables } from '../../helpers/db';

beforeEach(resetBusinessTables);
afterAll(() => prisma.$disconnect());

describe('shop looks', () => {
  it('uses the plan limit whatever the term, explains it, and frees a place when a look is archived', async () => {
    const ws = await createTestWorkspace('shop');
    await withSerializable(async (tx) => {
      const sub = await createPendingSubscription(tx, { workspaceId: ws.id, planId: 'shop_starter', termMonths: 6 });
      return activate(tx, sub.id, new Date());
    });
    const template = await prisma.setTemplate.findFirstOrThrow({ where: { product: 'shop', isActive: true } });
    const limit = PLANS.shop_starter.maxSets;
    const looks = [];
    for (let i = 0; i < limit; i += 1) looks.push(await createSet(ws, { templateId: template.id, name: `Look ${i}`, modelRef: 'me' }));

    await expect(createSet(ws, { templateId: template.id, name: 'One too many', modelRef: 'me' }))
      .rejects.toMatchObject({ code: 'set_limit', message: expect.stringMatching(/Archive one you don't use, or move to Growth for 20/) });

    await prisma.studioSet.update({ where: { id: looks[0]!.id }, data: { status: 'archived' } });
    await expect(createSet(ws, { templateId: template.id, name: 'After archive', modelRef: 'me' })).resolves.toMatchObject({ name: 'After archive' });
  });
});
