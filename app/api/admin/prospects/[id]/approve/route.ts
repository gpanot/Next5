/**
 * POST /api/admin/prospects/[id]/approve — "Approve faces": the held run goes on (steps 4-6, the Brand Cast
 * slideshows) in the background; the admin tab then calls …/advance for the other parts.
 */
import { waitUntil } from '@vercel/functions';
import { adminRoute, audit, json } from '../../../../../../src/server/admin/route';
import { approveFaces } from '../../../../../../src/server/prospects/advance';
import { packDto } from '../../../../../../src/server/prospects/store';

// Step 4 runs here; on Vercel steps 5-6 continue in their own invocation (the pipeline hand-off).
export const maxDuration = 300;

type Ctx = RouteContext<'/api/admin/prospects/[id]/approve'>;

export const POST = adminRoute<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  const work = await approveFaces(id);
  await audit('prospect_approve_faces', 'prospect_pack', id);
  waitUntil(work());
  return json({ pack: await packDto(id) });
});
