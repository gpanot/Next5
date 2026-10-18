/**
 * GET    /api/admin/prospects/[id] — one Prospect Pack.
 * DELETE /api/admin/prospects/[id] — removes the pack (its link stops working) and trashes its workspace. Not once claimed.
 */
import { prisma } from '../../../../../src/lib/db';
import { adminRoute, audit, json } from '../../../../../src/server/admin/route';
import { deleteSlideshowWorkspace } from '../../../../../src/server/autoSlideshow/workspaceTrash';
import { HttpError } from '../../../../../src/server/http';
import { loadPack, packDto } from '../../../../../src/server/prospects/store';

type Ctx = RouteContext<'/api/admin/prospects/[id]'>;

export const GET = adminRoute<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  return json({ pack: await packDto(id) });
});

export const DELETE = adminRoute<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  const pack = await loadPack(id);
  if (pack.status === 'claimed') throw new HttpError(409, 'claimed', 'This pack was claimed: it is the user’s workspace now.');
  await deleteSlideshowWorkspace(pack.ownerUserId, pack.workspaceId);
  await prisma.prospectPack.delete({ where: { id } });
  await audit('prospect_delete', 'prospect_pack', id, { workspaceId: pack.workspaceId });
  return json({ ok: true });
});
