import { adminRoute, json } from '../../../../../../src/server/admin/route';
import { prisma } from '../../../../../../src/lib/db';

/** DELETE — hides a character from the lab. Its file stays, so videos made with it keep their thumbnail. */
export const DELETE = adminRoute(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  await prisma.ugcCharacter.updateMany({ where: { id }, data: { archived: true } });
  return json({ ok: true });
});
