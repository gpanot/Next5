import { prisma } from '../../../../../src/lib/db';
import { adminRoute, json } from '../../../../../src/server/admin/route';

/** GET — promise claims, pending first. */
export const GET = adminRoute(async () => {
  const claims = await prisma.promiseClaim.findMany({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], take: 200, include: { workspace: { select: { name: true, product: true, owner: { select: { email: true } } } } } });
  return json({
    claims: claims.map((c) => ({
      id: c.id, workspace: c.workspace.name, product: c.workspace.product, email: c.workspace.owner.email, platform: c.platform, metric: c.metric,
      beforeAverage: c.beforeAverage, afterAverage: c.afterAverage, postsCounted: c.postsCounted, links: c.links, note: c.note,
      sharePermission: c.sharePermission, status: c.status, outcome: c.outcome, adminNote: c.adminNote, createdAt: c.createdAt.toISOString(),
    })),
  });
});
