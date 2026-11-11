/**
 * POST /api/admin/prospects/[id]/reopen — "Back to review": a ready pack's posts go on the user calendar for the admin
 * to edit, and its link closes until the next "Generate calendar". → the pack.
 */
import { adminRoute, audit, json } from '../../../../../../src/server/admin/route';
import { reopenReview } from '../../../../../../src/server/prospects/generate';
import { packDto } from '../../../../../../src/server/prospects/store';

type Ctx = RouteContext<'/api/admin/prospects/[id]/reopen'>;

export const POST = adminRoute<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  await reopenReview(id);
  await audit('prospect_reopen', 'prospect_pack', id);
  return json({ pack: await packDto(id) });
});
