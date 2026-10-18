/**
 * POST /api/admin/prospects/[id]/advance — one step of a pack being made (prospects/advance.ts), after the response.
 * The admin tab calls it every few seconds while the pack is open; calls at once never repeat work. → the pack.
 */
import { waitUntil } from '@vercel/functions';
import { adminRoute, json } from '../../../../../../src/server/admin/route';
import { advanceProspect } from '../../../../../../src/server/prospects/advance';
import { packDto } from '../../../../../../src/server/prospects/store';

// The Hooks Volume campaign (writing, stock photos, render) takes 1-3 minutes.
export const maxDuration = 300;

type Ctx = RouteContext<'/api/admin/prospects/[id]/advance'>;

export const POST = adminRoute<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  waitUntil(advanceProspect(id).catch((err: unknown) => console.error(`[prospects] advance ${id} failed:`, err instanceof Error ? err.message : err)));
  return json({ pack: await packDto(id) });
});
