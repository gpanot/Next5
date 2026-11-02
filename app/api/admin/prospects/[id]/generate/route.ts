/**
 * POST /api/admin/prospects/[id]/generate — "Generate calendar", after the review: the videos render, then the link
 * opens. The admin tab's …/advance calls do the work. → the pack.
 */
import { adminRoute, audit, json } from '../../../../../../src/server/admin/route';
import { startGenerating } from '../../../../../../src/server/prospects/generate';
import { packDto } from '../../../../../../src/server/prospects/store';

type Ctx = RouteContext<'/api/admin/prospects/[id]/generate'>;

export const POST = adminRoute<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  await startGenerating(id);
  await audit('prospect_generate', 'prospect_pack', id);
  return json({ pack: await packDto(id) });
});
