import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { getBalance } from '../../../src/server/credits/ledger';
import { withSerializable } from '../../../src/server/db/transaction';
import {
  activate,
  createPendingSubscription,
  expireEnded,
  getActiveSubscription,
  getQueuedRenewal,
  issueDueGrants,
} from '../../../src/server/subscriptions/subscriptions';
import type { PlanId, TermMonths } from '../../../src/config/plans';
import { at, createTestWorkspace, resetBusinessTables } from '../../helpers/db';

beforeEach(resetBusinessTables);
afterAll(() => prisma.$disconnect());

const buyAndActivate = async (workspaceId: string, planId: PlanId, termMonths: TermMonths, paidAt: Date) =>
  withSerializable(async (tx) => {
    const sub = await createPendingSubscription(tx, { workspaceId, planId, termMonths });
    return activate(tx, sub.id, paidAt);
  });

describe('activate', () => {
  it('starts now, grants month 1, and is idempotent', async () => {
    const ws = await createTestWorkspace();
    const paidAt = at('2026-09-14T10:00:00Z');
    const sub = await buyAndActivate(ws.id, 'brand_starter', 3, paidAt);

    expect(sub.status).toBe('active');
    expect(sub.startsAt).toEqual(paidAt);
    expect(sub.endsAt).toEqual(at('2026-12-14T10:00:00Z'));
    expect(sub.grantsIssued).toBe(1);
    expect((await getBalance(ws.id, paidAt)).total).toBe(30);

    await withSerializable((tx) => activate(tx, sub.id, paidAt));
    expect((await getBalance(ws.id, paidAt)).total).toBe(30);
  });

  it('queues a same-plan renewal after the current term', async () => {
    const ws = await createTestWorkspace();
    await buyAndActivate(ws.id, 'brand_pro', 1, at('2026-09-14T00:00:00Z'));
    const renewal = await buyAndActivate(ws.id, 'brand_pro', 1, at('2026-10-10T00:00:00Z'));

    expect(renewal.startsAt).toEqual(at('2026-10-14T00:00:00Z'));
    expect(renewal.grantsIssued).toBe(0);
    expect(await getQueuedRenewal(ws.id, at('2026-10-10T00:00:00Z'))).not.toBeNull();
    expect((await getActiveSubscription(ws.id, at('2026-10-20T00:00:00Z')))?.id).toBe(renewal.id);
  });

  it('starts an upgrade immediately and cancels the current plan', async () => {
    const ws = await createTestWorkspace();
    const starter = await buyAndActivate(ws.id, 'brand_starter', 3, at('2026-09-14T00:00:00Z'));
    const pro = await buyAndActivate(ws.id, 'brand_pro', 1, at('2026-10-01T00:00:00Z'));

    expect(pro.startsAt).toEqual(at('2026-10-01T00:00:00Z'));
    const old = await prisma.subscription.findUniqueOrThrow({ where: { id: starter.id } });
    expect(old.status).toBe('cancelled');
    expect((await getBalance(ws.id, at('2026-10-01T00:00:00Z'))).total).toBe(30 + 120);
  });
});

describe('issueDueGrants', () => {
  it('issues exactly termMonths grants across simulated months', async () => {
    const ws = await createTestWorkspace();
    await buyAndActivate(ws.id, 'shop_starter', 3, at('2026-01-31T00:00:00Z'));

    const run = (iso: string) => withSerializable((tx) => issueDueGrants(tx, at(iso)));
    expect(await run('2026-02-15T00:00:00Z')).toBe(0);
    expect(await run('2026-02-28T00:00:00Z')).toBe(1); // Jan 31 + 1 month clamps to Feb 28
    expect(await run('2026-02-28T12:00:00Z')).toBe(0);
    expect(await run('2026-06-01T00:00:00Z')).toBe(1); // catches up the 3rd and final grant
    expect(await run('2026-09-01T00:00:00Z')).toBe(0);

    const grants = await prisma.creditLedger.count({ where: { workspaceId: ws.id, reason: 'plan_grant' } });
    expect(grants).toBe(3);
  });

  it('plan credits from a past month are no longer spendable', async () => {
    const ws = await createTestWorkspace();
    await buyAndActivate(ws.id, 'shop_starter', 1, at('2026-09-14T00:00:00Z'));
    expect((await getBalance(ws.id, at('2026-10-13T00:00:00Z'))).total).toBe(100);
    expect((await getBalance(ws.id, at('2026-10-14T00:00:00Z'))).total).toBe(0);
  });
});

describe('expireEnded', () => {
  it('expires subscriptions past their end date', async () => {
    const ws = await createTestWorkspace();
    await buyAndActivate(ws.id, 'brand_starter', 1, at('2026-09-14T00:00:00Z'));
    expect(await withSerializable((tx) => expireEnded(tx, at('2026-10-13T00:00:00Z')))).toBe(0);
    expect(await withSerializable((tx) => expireEnded(tx, at('2026-10-14T00:00:00Z')))).toBe(1);
    expect(await getActiveSubscription(ws.id, at('2026-10-14T00:00:00Z'))).toBeNull();
  });
});
