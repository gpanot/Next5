import { NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { authedRoute } from '../../../../../src/server/api';
import { deleteObject } from '../../../../../src/server/storage/objectStore';

/**
 * DELETE /api/app/me/data
 *
 * Deletes ALL workspace data for the authenticated user across both products:
 *  - All generated/uploaded photos (R2 objects + DB rows)
 *  - All identity references (face data) + R2 objects
 *  - All products, sets, batches, batch items, influencers
 *  - All post materials (R2 + DB), post slots, post schedules, drop schedules
 *  - All listings, social connections, social posts, shop connections
 *  - All subscriptions, credit ledger entries, payments
 *  - All promise claims
 *  - The workspaces themselves
 *
 * The user account (email, display name, login) is KEPT.
 */
export const DELETE = authedRoute(async (_req, session) => {
  const userId = session.userId;

  // Collect all workspace IDs owned by this user
  const workspaces = await prisma.workspace.findMany({
    where: { ownerUserId: userId },
    select: { id: true },
  });
  const workspaceIds = workspaces.map((w) => w.id);

  if (workspaceIds.length === 0) {
    return NextResponse.json({ deleted: true });
  }

  // ── 1. Delete R2 objects for identity references ─────────────────────────
  const identities = await prisma.identityReference.findMany({
    where: { workspaceId: { in: workspaceIds }, deletedAt: null },
    select: { id: true, r2Key: true },
  });
  await Promise.allSettled(identities.map((r) => deleteObject(r.r2Key)));

  // ── 2. Delete R2 objects for batch items ──────────────────────────────────
  const items = await prisma.batchItem.findMany({
    where: { batch: { workspaceId: { in: workspaceIds } }, r2Key: { not: null } },
    select: { r2Key: true },
  });
  await Promise.allSettled(items.filter((i) => i.r2Key).map((i) => deleteObject(i.r2Key!)));

  // ── 3. Delete R2 objects for post materials ───────────────────────────────
  const materials = await prisma.postMaterial.findMany({
    where: { workspaceId: { in: workspaceIds } },
    select: { r2Key: true },
  });
  await Promise.allSettled(materials.map((m) => deleteObject(m.r2Key)));

  // ── 4. Delete R2 objects for influencer base images ───────────────────────
  const influencers = await prisma.influencer.findMany({
    where: { workspaceId: { in: workspaceIds }, baseImageKey: { not: null } },
    select: { baseImageKey: true },
  });
  await Promise.allSettled(influencers.filter((i) => i.baseImageKey).map((i) => deleteObject(i.baseImageKey!)));

  // ── 5. Delete DB data (cascade order respects FK constraints) ─────────────
  // BatchItems cascade from Batches; Batches cascade from Workspace.
  // We soft-delete identities first then hard-delete.
  await prisma.identityReference.updateMany({
    where: { workspaceId: { in: workspaceIds } },
    data: { deletedAt: new Date(), wavespeedUrl: null },
  });

  // Delete workspaces — all related rows with onDelete: Cascade are handled by Prisma/Postgres.
  // Rows without cascade (e.g. payments, subscriptions, ledger) are explicitly cleared first.
  await prisma.payment.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
  await prisma.creditLedger.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
  await prisma.subscription.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
  await prisma.consentRecord.deleteMany({ where: { userId } });

  // Now delete workspaces; all cascade-configured relations go with them.
  await prisma.workspace.deleteMany({ where: { id: { in: workspaceIds } } });

  return NextResponse.json({ deleted: true });
});
