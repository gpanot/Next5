import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { getBalance } from '../../../src/server/credits/ledger';
import { markPaidAndFulfil, LATE_PAYMENT_WINDOW_MS } from '../../../src/server/payments/fulfill';
import { createSubscriptionPayment, createTopupPayment, getPaymentForUser, describePaymentItem } from '../../../src/server/payments/payments';
import { createReference, extractReference } from '../../../src/server/payments/reference';
import { createTestWorkspace, resetBusinessTables } from '../../helpers/db';

beforeEach(resetBusinessTables);
afterAll(() => prisma.$disconnect());

describe('references', () => {
  it('creates N5 + 8 unambiguous characters', () => {
    const ref = createReference();
    expect(ref).toMatch(/^N5[A-HJ-NP-Z2-9]{8}$/);
  });

  it('finds a reference in messy bank memo text', () => {
    expect(extractReference('CT tu 0123 n5 k7qx-2m9a thanh toan')).toBe('N5K7QX2M9A');
    expect(extractReference('no reference here')).toBeNull();
  });
});

describe('subscription payments', () => {
  it('prices in USD, freezes VND, and activates with credits when paid', async () => {
    const ws = await createTestWorkspace('brand');
    const payment = await createSubscriptionPayment({ userId: ws.ownerUserId, workspaceId: ws.id }, { planId: 'brand_pro', termMonths: 3 });
    expect(payment.amountUsdCents).toBe(13_200);
    expect(payment.amountVnd).toBe(3_432_000);
    expect(describePaymentItem(payment)).toBe('Brand Pro · 3 months');

    const result = await markPaidAndFulfil(payment.id, payment.amountVnd);
    expect(result.outcome).toBe('paid');
    const sub = await prisma.subscription.findFirstOrThrow({ where: { paymentId: payment.id } });
    expect(sub.status).toBe('active');
    expect((await getBalance(ws.id)).total).toBe(90);
  });

  it('fulfils exactly once', async () => {
    const ws = await createTestWorkspace('brand');
    const payment = await createSubscriptionPayment({ userId: ws.ownerUserId, workspaceId: ws.id }, { planId: 'brand_starter', termMonths: 1 });
    await markPaidAndFulfil(payment.id, payment.amountVnd);
    const again = await markPaidAndFulfil(payment.id, payment.amountVnd);
    expect(again.outcome).toBe('duplicate');
    expect((await getBalance(ws.id)).total).toBe(30);
  });

  it('keeps underpaid transfers out of fulfilment', async () => {
    const ws = await createTestWorkspace('shop');
    const payment = await createSubscriptionPayment({ userId: ws.ownerUserId, workspaceId: ws.id }, { planId: 'shop_starter', termMonths: 1 });
    const result = await markPaidAndFulfil(payment.id, payment.amountVnd - 1_000);
    expect(result.outcome).toBe('underpaid');
    expect((await getBalance(ws.id)).total).toBe(0);
  });

  it('honours late transfers within 72 hours, not after', async () => {
    const ws = await createTestWorkspace('shop');
    const payment = await createSubscriptionPayment({ userId: ws.ownerUserId, workspaceId: ws.id }, { planId: 'shop_starter', termMonths: 1 });
    const justInside = new Date(payment.expiresAt.getTime() + LATE_PAYMENT_WINDOW_MS - 1_000);
    expect((await markPaidAndFulfil(payment.id, payment.amountVnd, justInside)).outcome).toBe('paid');

    const other = await createSubscriptionPayment({ userId: ws.ownerUserId, workspaceId: ws.id }, { planId: 'shop_starter', termMonths: 1 });
    const tooLate = new Date(other.expiresAt.getTime() + LATE_PAYMENT_WINDOW_MS + 1_000);
    expect((await markPaidAndFulfil(other.id, other.amountVnd, tooLate)).outcome).toBe('too_late');
  });
});

describe('top-up payments', () => {
  it('grants top-up credits valid for 12 months', async () => {
    const ws = await createTestWorkspace('shop');
    const payment = await createTopupPayment({ userId: ws.ownerUserId, workspaceId: ws.id }, 'topup_60');
    const paidAt = new Date('2026-09-14T00:00:00Z');
    await markPaidAndFulfil(payment.id, payment.amountVnd, new Date(payment.expiresAt.getTime() - 60_000));
    const balance = await getBalance(ws.id, paidAt);
    expect(balance.byBucket.topup).toBe(60);
    expect(balance.nextExpiry?.credits).toBe(60);
  });
});

describe('getPaymentForUser', () => {
  it('hides other users payments and expires stale ones on read', async () => {
    const ws = await createTestWorkspace('brand');
    const payment = await createTopupPayment({ userId: ws.ownerUserId, workspaceId: ws.id }, 'topup_20');
    await expect(getPaymentForUser(payment.id, 'someone-else')).rejects.toMatchObject({ status: 404 });
    const later = new Date(payment.expiresAt.getTime() + 1_000);
    expect((await getPaymentForUser(payment.id, ws.ownerUserId, later)).state).toBe('expired');
  });
});
