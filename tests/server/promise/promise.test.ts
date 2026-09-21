import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { getBalance } from '../../../src/server/credits/ledger';
import { withSerializable } from '../../../src/server/db/transaction';
import { decideClaim, parseClaim, promiseStatus, submitClaim } from '../../../src/server/promise/promise';
import { activate, createPendingSubscription } from '../../../src/server/subscriptions/subscriptions';
import { at, createTestWorkspace, resetBusinessTables } from '../../helpers/db';

beforeEach(resetBusinessTables);
afterAll(() => prisma.$disconnect());

const claim = (before: number, after: number) => parseClaim({ platform: 'instagram', metric: 'likes', beforeAverage: before, afterAverage: after, postsCounted: 12, links: ['https://instagram.com/p/1', 'not a link'], sharePermission: true });

describe('Beat-your-feed promise', () => {
  it('needs a paid plan for 30 days, records a win, and owes a free month on a miss', async () => {
    const ws = await createTestWorkspace('shop');
    expect((await promiseStatus(ws.id, at('2026-09-20T00:00:00Z'))).reason).toBe('no_plan');

    await withSerializable(async (tx) => {
      const sub = await createPendingSubscription(tx, { workspaceId: ws.id, planId: 'shop_pro', termMonths: 12 });
      return activate(tx, sub.id, at('2026-09-01T00:00:00Z'));
    });
    await expect(submitClaim(ws.ownerUserId, ws.id, claim(40, 30), at('2026-09-20T00:00:00Z'))).rejects.toMatchObject({ status: 409 });

    const won = await submitClaim(ws.ownerUserId, ws.id, claim(40, 65), at('2026-10-02T00:00:00Z'));
    expect(won).toMatchObject({ outcome: 'won', status: 'recorded', links: ['https://instagram.com/p/1'] });
    expect((await promiseStatus(ws.id, at('2026-10-10T00:00:00Z'))).reason).toBe('cooldown');

    const missed = await submitClaim(ws.ownerUserId, ws.id, claim(40, 30), at('2026-11-02T00:00:00Z'));
    expect(missed).toMatchObject({ outcome: 'missed', status: 'pending' });
    const before = (await getBalance(ws.id, at('2026-11-03T00:00:00Z'))).total;
    await decideClaim(missed.id, 'grant', 'checked links', at('2026-11-03T00:00:00Z'));
    expect((await getBalance(ws.id, at('2026-11-03T00:00:00Z'))).total).toBe(before + 400);
    await expect(decideClaim(missed.id, 'grant', null)).rejects.toMatchObject({ status: 409 });
  });

  it('rejects claims with too few posts', () => {
    expect(() => parseClaim({ platform: 'tiktok', metric: 'views', beforeAverage: 1, afterAverage: 2, postsCounted: 5 })).toThrow(/at least 12/);
  });
});
