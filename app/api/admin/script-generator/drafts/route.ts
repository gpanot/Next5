/** GET /api/admin/script-generator/drafts — saved scripts, newest first. POST { input, script, model } — saves a new script. */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../src/server/admin/route';
import { createDraft, listDrafts } from '../../../../../src/server/scriptGenerator/drafts';

export const GET = adminRoute(async () => json({ drafts: await listDrafts() }));

export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return json({ draft: await createDraft(body) });
});
