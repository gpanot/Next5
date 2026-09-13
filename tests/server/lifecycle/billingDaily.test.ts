import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { getBalance } from '../../../src/server/credits/ledger';
import { withSerializable } from '../../../src/server/db/transaction';
import { runBillingDaily } from '../../../src/server/lifecycle/billingDaily';
import { activate, createPendingSubscription } from '../../../src/server/subscriptions/subscriptions';
import { at, createTestWorkspace, resetBusinessTables } from '../../helpers/db';

beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  await resetBusinessTables();
});
afterAll(() => prisma.$disconnect());

const buy = (workspaceId: string, termMonths: 1 | 3, paidAt: Date) =>
  withSerializable(async (tx) => {
    const sub = await createPendingSubscription(tx, { workspaceId, planId: 'brand_starter', termMonths });
    return activate(tx, sub.id, paidAt);
  });

const emails = (template: string) => prisma.emailLog.count({ where: { template } });

describe('runBillingDaily', () => {
  it('grants monthly credits with one email per grant and never double-sends', async () => {
    const ws = await createTestWorkspace('brand');
    await buy(ws.id, 3, at('2026-09-14T00:00:00Z'));

    const first = await runBillingDaily(at('2026-10-14T02:00:00Z'));
    expect(first.grants).toBe(1);
    expect(first.grantEmails).toBe(1);
    await runBillingDaily(at('2026-10-14T03:00:00Z'));
    expect(await emails('credits_granted')).toBe(1);
    expect((await getBalance(ws.id, at('2026-10-14T03:00:00Z'))).total).toBe(30);
  });

  it('sends the 7-day and 1-day renewal reminders once each, then plan ended', async () => {
    const ws = await createTestWorkspace('brand');
    await buy(ws.id, 1, at('2026-09-14T00:00:00Z'));

    await runBillingDaily(at('2026-10-08T01:00:00Z'));
    await runBillingDaily(at('2026-10-09T01:00:00Z'));
    expect(await emails('renewal_7d')).toBe(1);

    await runBillingDaily(at('2026-10-13T12:00:00Z'));
    await runBillingDaily(at('2026-10-13T13:00:00Z'));
    expect(await emails('renewal_1d')).toBe(1);

    const end = await runBillingDaily(at('2026-10-14T01:00:00Z'));
    expect(end.expiredSubscriptions).toBe(1);
    await runBillingDaily(at('2026-10-15T01:00:00Z'));
    expect(await emails('plan_ended')).toBe(1);
  });

  it('skips reminders and plan-ended emails when a renewal is queued', async () => {
    const ws = await createTestWorkspace('brand');
    await buy(ws.id, 1, at('2026-09-14T00:00:00Z'));
    await buy(ws.id, 1, at('2026-10-01T00:00:00Z'));
    await runBillingDaily(at('2026-10-10T01:00:00Z'));
    await runBillingDaily(at('2026-10-14T01:00:00Z'));
    expect(await emails('renewal_7d')).toBe(0);
    expect(await emails('plan_ended')).toBe(0);
  });

  it('nudges trial users without a plan once', async () => {
    const ws = await createTestWorkspace('shop');
    await prisma.workspace.update({ where: { id: ws.id }, data: { trialUsedAt: at('2026-09-10T00:00:00Z') } });
    const summary = await runBillingDaily(at('2026-09-12T00:00:00Z'));
    await runBillingDaily(at('2026-09-13T00:00:00Z'));
    expect(summary.trialNudges).toBe(1);
    expect(await emails('trial_nudge')).toBe(1);
  });
});
