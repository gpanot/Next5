// server-only — never import from a 'use client' file.
// Autopilot posts cost 1 credit each. A post that fails gives its credit back.
// The video worker marks failures in its own process, so refunds run as a reconcile on read
// (the credits pill and the playbook screen), not at the moment of failure.

import { withSerializable, type Tx } from '../db/transaction';

const REF_TYPE = 'campaign_post';

/** Charge refIds look like `${postId}` (first charge) or `${postId}:${n}` (each "Try again"). */
const postIdOf = (refId: string): string => refId.split(':')[0] ?? refId;

/** Posts of this workspace whose slideshow failed or whose listing video failed. */
const failedPostIds = async (tx: Tx, workspaceId: string): Promise<string[]> => {
  const rows = await tx.campaignPost.findMany({
    where: {
      campaign: { workspaceId },
      OR: [{ mediaStatus: 'failed' }, { listingVideo: { status: 'failed' } }],
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
};

/** Charge rows of these posts that no refund row matches yet. */
const unrefundedCharges = async (tx: Tx, workspaceId: string, postIds: readonly string[]) => {
  const ids = new Set(postIds);
  const rows = await tx.creditLedger.findMany({
    where: { workspaceId, refType: REF_TYPE, reason: { in: ['batch_reserve', 'item_refund'] } },
    select: { reason: true, refId: true, bucket: true, grantId: true, delta: true },
  });
  const mine = rows.filter((r) => r.refId && ids.has(postIdOf(r.refId)));
  const refunded = new Set(mine.filter((r) => r.reason === 'item_refund').map((r) => `${r.refId}|${r.grantId}`));
  return mine.filter((r) => r.reason === 'batch_reserve' && !refunded.has(`${r.refId}|${r.grantId}`));
};

/** Gives back the credit of every failed post that still holds one. Idempotent. Returns credits refunded. */
export const refundFailedPosts = async (workspaceId: string): Promise<number> =>
  withSerializable(async (tx) => {
    const failed = await failedPostIds(tx, workspaceId);
    if (failed.length === 0) return 0;
    const charges = await unrefundedCharges(tx, workspaceId, failed);
    if (charges.length === 0) return 0;
    await tx.creditLedger.createMany({
      data: charges.map((c) => ({
        workspaceId,
        delta: -c.delta,
        reason: 'item_refund' as const,
        bucket: c.bucket,
        grantId: c.grantId,
        refType: REF_TYPE,
        refId: c.refId,
      })),
      skipDuplicates: true,
    });
    return charges.reduce((sum, c) => sum - c.delta, 0);
  });

/** Same as refundFailedPosts, but never breaks the page that called it. */
export const refundFailedPostsQuietly = (workspaceId: string): Promise<number> =>
  refundFailedPosts(workspaceId).catch((err: unknown) => {
    console.error('[credits] refundFailedPosts', workspaceId, err);
    return 0;
  });
