/**
 * GET  /api/admin/prospects — Prospect Packs, newest first.
 * POST /api/admin/prospects — { websiteUrl, name?, tzOffsetMin? } → a new pack: placeholder owner, workspace and its first
 *      run (held after step 3 for the face check), started in the background.
 */
import { waitUntil } from '@vercel/functions';
import { adminRoute, audit, json } from '../../../../src/server/admin/route';
import { createProspect } from '../../../../src/server/prospects/create';
import { listPacks, packDto } from '../../../../src/server/prospects/store';

// Steps 1-3 and the warm-up run in this invocation.
export const maxDuration = 300;

export const GET = adminRoute(async () => json({ packs: await listPacks() }));

export const POST = adminRoute(async (req) => {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const { id, work } = await createProspect(body);
  await audit('prospect_create', 'prospect_pack', id, { websiteUrl: typeof body.websiteUrl === 'string' ? body.websiteUrl : '' });
  waitUntil(work());
  return json({ pack: await packDto(id) }, { status: 201 });
});
