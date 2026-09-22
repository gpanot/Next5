import { NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/db';
import { authedRoute } from '../../../../src/server/api';
import { buildMe } from '../../../../src/server/me';
import { deleteObject } from '../../../../src/server/storage/objectStore';
import { isProductLine } from '../../../../src/server/workspaces/workspaces';

/** GET /api/app/me?product= — user, workspace, plan, credits and banners for the app shell. */
export const GET = authedRoute(async (req, session) => {
  const product = new URL(req.url).searchParams.get('product');
  return NextResponse.json(await buildMe(session.userId, isProductLine(product) ? product : undefined));
});

/**
 * DELETE /api/app/me
 *
 * Permanently deletes:
 *  - All workspace data (same as DELETE /api/app/me/data)
 *  - The user account itself
 *
 * The client must clear the session token and redirect to the home page after calling this.
 */
export const DELETE = authedRoute(async (_req, session) => {
  const userId = session.userId;

  // Collect all workspace IDs owned by this user
  const workspaces = await prisma.workspace.findMany({
    where: { ownerUserId: userId },
    select: { id: true },
  });
  const workspaceIds = workspaces.map((w) => w.id);

  if (workspaceIds.length > 0) {
    // ── Delete R2 objects for identity references ───────────────────────────
    const identities = await prisma.identityReference.findMany({
      where: { workspaceId: { in: workspaceIds }, deletedAt: null },
      select: { r2Key: true },
    });
    await Promise.allSettled(identities.map((r) => deleteObject(r.r2Key)));

    // ── Delete R2 objects for batch items ────────────────────────────────────
    const items = await prisma.batchItem.findMany({
      where: { batch: { workspaceId: { in: workspaceIds } }, r2Key: { not: null } },
      select: { r2Key: true },
    });
    await Promise.allSettled(items.filter((i) => i.r2Key).map((i) => deleteObject(i.r2Key!)));

    // ── Delete R2 objects for post materials ─────────────────────────────────
    const materials = await prisma.postMaterial.findMany({
      where: { workspaceId: { in: workspaceIds } },
      select: { r2Key: true },
    });
    await Promise.allSettled(materials.map((m) => deleteObject(m.r2Key)));

    // ── Delete R2 objects for influencer base images ──────────────────────────
    const influencers = await prisma.influencer.findMany({
      where: { workspaceId: { in: workspaceIds }, baseImageKey: { not: null } },
      select: { baseImageKey: true },
    });
    await Promise.allSettled(influencers.filter((i) => i.baseImageKey).map((i) => deleteObject(i.baseImageKey!)));

    // ── Delete DB data ────────────────────────────────────────────────────────
    await prisma.payment.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
    await prisma.creditLedger.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
    await prisma.subscription.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
    await prisma.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
  }

  // ── Delete remaining user-scoped rows ──────────────────────────────────────
  await prisma.consentRecord.deleteMany({ where: { userId } });
  await prisma.payment.deleteMany({ where: { userId, workspaceId: null } });

  // ── Delete the user account ────────────────────────────────────────────────
  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ deleted: true });
});
