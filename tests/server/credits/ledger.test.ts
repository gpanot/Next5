import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/lib/db';
import {
  chargeRedo,
  expireDue,
  getBalance,
  grant,
  InsufficientCreditsError,
  refundItem,
  reserveForBatch,
} from '../../../src/server/credits/ledger';
import { withSerializable } from '../../../src/server/db/transaction';
import { at, createTestWorkspace, resetBusinessTables } from '../../helpers/db';

const NOW = at('2026-10-01T00:00:00Z');

const grantPlan = (workspaceId: string, amount: number, refId: string, expiresAt: string) =>
  withSerializable((tx) =>
    grant(tx, { workspaceId, bucket: 'plan', amount, reason: 'plan_grant', refType: 'subscription', refId, expiresAt: at(expiresAt) }),
  );

const grantTopup = (workspaceId: string, amount: number, refId: string, expiresAt: string) =>
  withSerializable((tx) =>
    grant(tx, { workspaceId, bucket: 'topup', amount, reason: 'topup_grant', refType: 'payment', refId, expiresAt: at(expiresAt) }),
  );

beforeEach(resetBusinessTables);
afterAll(() => prisma.$disconnect());

describe('grant', () => {
  it('is idempotent for the same reference', async () => {
    const ws = await createTestWorkspace();
    const first = await grantPlan(ws.id, 30, 'sub1:0', '2026-11-01T00:00:00Z');
    const second = await grantPlan(ws.id, 30, 'sub1:0', '2026-11-01T00:00:00Z');
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect((await getBalance(ws.id, NOW)).total).toBe(30);
  });

  it('rejects non-positive amounts', async () => {
    const ws = await createTestWorkspace();
    await expect(grantPlan(ws.id, 0, 'x', '2026-11-01T00:00:00Z')).rejects.toThrow();
  });
});

describe('getBalance', () => {
  it('ignores expired grants and separates trial credits', async () => {
    const ws = await createTestWorkspace();
    await grantPlan(ws.id, 30, 'old', '2026-09-15T00:00:00Z');
    await grantPlan(ws.id, 30, 'current', '2026-11-01T00:00:00Z');
    await withSerializable((tx) =>
      grant(tx, { workspaceId: ws.id, bucket: 'trial', amount: 3, reason: 'trial_grant', refType: 'trial', refId: ws.id, expiresAt: null }),
    );
    const balance = await getBalance(ws.id, NOW);
    expect(balance.total).toBe(30);
    expect(balance.trial).toBe(3);
    expect(balance.nextExpiry).toEqual({ at: at('2026-11-01T00:00:00Z'), credits: 30 });
  });
});

describe('reserveForBatch', () => {
  it('spends plan credits before top-ups, soonest expiry first', async () => {
    const ws = await createTestWorkspace();
    await grantTopup(ws.id, 20, 'pay1', '2027-09-01T00:00:00Z');
    await grantPlan(ws.id, 10, 'late', '2026-12-01T00:00:00Z');
    await grantPlan(ws.id, 10, 'soon', '2026-11-01T00:00:00Z');

    await withSerializable((tx) => reserveForBatch(tx, { workspaceId: ws.id, batchId: 'b1', credits: 15, isTrial: false, now: NOW }));

    const balance = await getBalance(ws.id, NOW);
    expect(balance.byBucket.plan).toBe(5);
    expect(balance.byBucket.topup).toBe(20);
    const soon = await prisma.creditLedger.findFirstOrThrow({ where: { refId: 'soon', grantId: null } });
    const spentFromSoon = await prisma.creditLedger.aggregate({ where: { grantId: soon.id }, _sum: { delta: true } });
    expect(spentFromSoon._sum.delta).toBe(-10);
  });

  it('splits across buckets when plan credits run out', async () => {
    const ws = await createTestWorkspace();
    await grantPlan(ws.id, 10, 's', '2026-11-01T00:00:00Z');
    await grantTopup(ws.id, 20, 'p', '2027-09-01T00:00:00Z');
    await withSerializable((tx) => reserveForBatch(tx, { workspaceId: ws.id, batchId: 'b1', credits: 25, isTrial: false, now: NOW }));
    const balance = await getBalance(ws.id, NOW);
    expect(balance.byBucket.plan).toBe(0);
    expect(balance.byBucket.topup).toBe(5);
    expect(await prisma.creditLedger.count({ where: { reason: 'batch_reserve' } })).toBe(2);
  });

  it('throws InsufficientCreditsError and writes nothing', async () => {
    const ws = await createTestWorkspace();
    await grantPlan(ws.id, 10, 's', '2026-11-01T00:00:00Z');
    const attempt = withSerializable((tx) => reserveForBatch(tx, { workspaceId: ws.id, batchId: 'b1', credits: 11, isTrial: false, now: NOW }));
    await expect(attempt).rejects.toBeInstanceOf(InsufficientCreditsError);
    expect(await prisma.creditLedger.count({ where: { reason: 'batch_reserve' } })).toBe(0);
    expect((await getBalance(ws.id, NOW)).total).toBe(10);
  });

  it('keeps trial credits for trial batches only', async () => {
    const ws = await createTestWorkspace();
    await withSerializable((tx) =>
      grant(tx, { workspaceId: ws.id, bucket: 'trial', amount: 3, reason: 'trial_grant', refType: 'trial', refId: ws.id, expiresAt: null }),
    );
    const paid = withSerializable((tx) => reserveForBatch(tx, { workspaceId: ws.id, batchId: 'b1', credits: 1, isTrial: false, now: NOW }));
    await expect(paid).rejects.toBeInstanceOf(InsufficientCreditsError);
    await withSerializable((tx) => reserveForBatch(tx, { workspaceId: ws.id, batchId: 'trial', credits: 3, isTrial: true, now: NOW }));
    expect((await getBalance(ws.id, NOW)).trial).toBe(0);
  });

  it('never double-spends under concurrent reservations', async () => {
    const ws = await createTestWorkspace();
    await grantPlan(ws.id, 10, 's', '2026-11-01T00:00:00Z');
    const results = await Promise.allSettled(
      ['b1', 'b2', 'b3'].map((batchId) =>
        withSerializable((tx) => reserveForBatch(tx, { workspaceId: ws.id, batchId, credits: 4, isTrial: false, now: NOW })),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
    expect((await getBalance(ws.id, NOW)).total).toBe(2);
  });
});

describe('refundItem', () => {
  it('returns credits once per reference', async () => {
    const ws = await createTestWorkspace();
    await grantPlan(ws.id, 10, 's', '2026-11-01T00:00:00Z');
    await withSerializable((tx) => reserveForBatch(tx, { workspaceId: ws.id, batchId: 'b1', credits: 4, isTrial: false, now: NOW }));
    const refund = () => withSerializable((tx) => refundItem(tx, { workspaceId: ws.id, batchId: 'b1', refKey: 'item1', credits: 1 }));
    expect(await refund()).toBe(1);
    expect(await refund()).toBe(0);
    expect((await getBalance(ws.id, NOW)).total).toBe(7);
  });

  it('never refunds more than the batch consumed', async () => {
    const ws = await createTestWorkspace();
    await grantPlan(ws.id, 10, 's', '2026-11-01T00:00:00Z');
    await withSerializable((tx) => reserveForBatch(tx, { workspaceId: ws.id, batchId: 'b1', credits: 2, isTrial: false, now: NOW }));
    for (const key of ['a', 'b', 'c']) {
      await withSerializable((tx) => refundItem(tx, { workspaceId: ws.id, batchId: 'b1', refKey: key, credits: 1 }));
    }
    expect((await getBalance(ws.id, NOW)).total).toBe(10);
  });

  it('refunds paid redo charges too', async () => {
    const ws = await createTestWorkspace();
    await grantPlan(ws.id, 10, 's', '2026-11-01T00:00:00Z');
    await withSerializable((tx) => reserveForBatch(tx, { workspaceId: ws.id, batchId: 'b1', credits: 1, isTrial: false, now: NOW }));
    await withSerializable((tx) => chargeRedo(tx, { workspaceId: ws.id, batchId: 'b1', itemId: 'i1', attempt: 3, credits: 1, now: NOW }));
    expect((await getBalance(ws.id, NOW)).total).toBe(8);
    await withSerializable((tx) => refundItem(tx, { workspaceId: ws.id, batchId: 'b1', refKey: 'i1:3', credits: 1 }));
    expect((await getBalance(ws.id, NOW)).total).toBe(9);
  });
});

describe('expireDue', () => {
  it('expires only the unconsumed remainder, once', async () => {
    const ws = await createTestWorkspace();
    await grantPlan(ws.id, 30, 's', '2026-11-01T00:00:00Z');
    await withSerializable((tx) => reserveForBatch(tx, { workspaceId: ws.id, batchId: 'b1', credits: 12, isTrial: false, now: NOW }));
    const later = at('2026-11-02T00:00:00Z');
    expect(await withSerializable((tx) => expireDue(tx, later))).toBe(18);
    expect(await withSerializable((tx) => expireDue(tx, later))).toBe(0);
    const net = await prisma.creditLedger.aggregate({ where: { workspaceId: ws.id }, _sum: { delta: true } });
    expect(net._sum.delta).toBe(0);
  });

  it('leaves unexpired grants alone', async () => {
    const ws = await createTestWorkspace();
    await grantTopup(ws.id, 20, 'p', '2027-09-01T00:00:00Z');
    expect(await withSerializable((tx) => expireDue(tx, NOW))).toBe(0);
    expect((await getBalance(ws.id, NOW)).total).toBe(20);
  });
});
