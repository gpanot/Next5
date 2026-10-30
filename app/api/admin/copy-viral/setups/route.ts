/**
 * GET    /api/admin/copy-viral/setups — saved setups (measured looks to reuse), newest first
 * POST   /api/admin/copy-viral/setups — { projectId, name } → saves that project's measured look (same name = replaced)
 * DELETE /api/admin/copy-viral/setups?slug=… — removes a saved setup
 * Localhost only.
 */
import type { NextRequest } from 'next/server';
import { json } from '../../../../../src/server/admin/route';
import { copyViralRoute } from '../../../../../src/server/copyViral/route';
import { deleteSetup, listSetups, saveSetup } from '../../../../../src/server/copyViral/setups';

export const GET = copyViralRoute(async () => json({ setups: await listSetups() }));

export const POST = copyViralRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as { projectId?: unknown; name?: unknown };
  if (typeof body.projectId !== 'string' || typeof body.name !== 'string' || !body.name.trim()) return json({ error: 'projectId and name are required' }, { status: 400 });
  return json({ setup: await saveSetup(body.projectId, body.name) });
});

export const DELETE = copyViralRoute(async (req: NextRequest) => {
  await deleteSetup(req.nextUrl.searchParams.get('slug') ?? '');
  return json({ ok: true });
});
