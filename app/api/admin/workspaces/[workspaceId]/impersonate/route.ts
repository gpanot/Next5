/**
 * POST /api/admin/workspaces/[workspaceId]/impersonate — a 1-hour session as the workspace's owner, so the admin sees
 * the app exactly as they do. Audited.
 */
import { prisma } from '../../../../../../src/lib/db';
import { signImpersonationToken } from '../../../../../../src/lib/studio-auth';
import { adminRoute, audit, json } from '../../../../../../src/server/admin/route';
import { HttpError } from '../../../../../../src/server/http';

type Ctx = RouteContext<'/api/admin/workspaces/[workspaceId]/impersonate'>;

export const POST = adminRoute<Ctx>(async (_req, ctx) => {
  const { workspaceId } = await ctx.params;
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { product: true, owner: { select: { id: true, email: true } } } });
  if (!ws) throw new HttpError(404, 'workspace_not_found', 'Workspace not found.');
  await audit('impersonate', 'workspace', workspaceId, { userId: ws.owner.id, email: ws.owner.email });
  return json({ token: signImpersonationToken(ws.owner.id, ws.owner.email), email: ws.owner.email, product: ws.product });
});
