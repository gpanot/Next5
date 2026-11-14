import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { chargePostRetry, chargePosts, getBalance, grant, refundFailedPosts } from '../../../src/server/credits/ledger';
import { withSerializable } from '../../../src/server/db/transaction';
import { at, createTestWorkspace, resetBusinessTables } from '../../helpers/db';

beforeEach(resetBusinessTables);
afterAll(() => prisma.$disconnect());

const setup = async () => {
  const ws = await createTestWorkspace();
  await withSerializable((tx) =>
    grant(tx, { workspaceId: ws.id, bucket: 'plan', amount: 5, reason: 'plan_grant', refType: 'subscription', refId: 's', expiresAt: at('2099-01-01T00:00:00Z') }),
  );
  const campaign = await prisma.campaign.create({ data: { workspaceId: ws.id, goal: 'sell', startDate: at('2026-11-15T00:00:00Z') } });
  // Template rows don't matter here: skip their foreign keys for these two inserts.
  const post = (dayIndex: number) =>
    prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET LOCAL session_replication_role = replica');
      return tx.campaignPost.create({
        data: { campaignId: campaign.id, dayIndex, scheduledFor: at('2026-11-15T00:00:00Z'), templateId: 't', versionId: 'v', purpose: 'awareness', format: 'slideshow', mediaStatus: 'generating' },
      });
    });
  const a = await post(0);
  const b = await post(1);
  await withSerializable((tx) => chargePosts(tx, { workspaceId: ws.id, postIds: [a.id, b.id] }));
  return { ws, a, b };
};

const total = async (id: string) => (await getBalance(id)).total;

describe('refundFailedPosts', () => {
  it('gives back the credit of a failed post once', async () => {
    const { ws, a } = await setup();
    expect(await total(ws.id)).toBe(3);
    await prisma.campaignPost.update({ where: { id: a.id }, data: { mediaStatus: 'failed' } });
    expect(await refundFailedPosts(ws.id)).toBe(1);
    expect(await refundFailedPosts(ws.id)).toBe(0);
    expect(await total(ws.id)).toBe(4);
  });

  it('charges a retry, and refunds it if it fails again', async () => {
    const { ws, a } = await setup();
    await prisma.campaignPost.update({ where: { id: a.id }, data: { mediaStatus: 'failed' } });
    await refundFailedPosts(ws.id);
    await withSerializable((tx) => chargePostRetry(tx, { workspaceId: ws.id, postId: a.id }));
    expect(await total(ws.id)).toBe(3);
    expect(await refundFailedPosts(ws.id)).toBe(1);
    expect(await total(ws.id)).toBe(4);
  });
});
