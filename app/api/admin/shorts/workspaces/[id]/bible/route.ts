/**
 * GET  /api/admin/shorts/workspaces/[id]/bible — the workspace's Visual Bible (null when no short has built it yet)
 * PUT  /api/admin/shorts/workspaces/[id]/bible — { bible: { field: text } } → saves an admin edit (used by the next photos)
 * POST /api/admin/shorts/workspaces/[id]/bible — reads the site's photos again and replaces the bible (~$0.01)
 */
import type { NextRequest } from 'next/server';
import { adminRoute, audit, json } from '../../../../../../../src/server/admin/route';
import { createMeter } from '../../../../../../../src/server/metaAds/cost';
import { getVisualBible, rebuildVisualBible, saveVisualBible } from '../../../../../../../src/server/shorts/visualBible';
import { isVisualBibleKey } from '../../../../../../../src/types/admin/visualBible';

export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

export const GET = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const found = await getVisualBible(id);
  if (!found) return json({ error: 'This workspace has no brand profile yet' }, { status: 404 });
  return json({ workspaceId: id, brandName: found.brandName, bible: found.bible });
});

export const PUT = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { bible?: Record<string, unknown> };
  const edit = Object.fromEntries(Object.entries(body.bible ?? {}).filter(([k, v]) => isVisualBibleKey(k) && typeof v === 'string'));
  if (!Object.keys(edit).length) return json({ error: 'Send at least one bible field' }, { status: 400 });
  const bible = await saveVisualBible(id, edit);
  if (!bible) return json({ error: 'Could not save: the hero product and people look must not be empty' }, { status: 400 });
  await audit('shorts.bible.edit', 'workspace', id, { fields: Object.keys(edit) });
  return json({ bible });
});

export const POST = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const bible = await rebuildVisualBible(id, createMeter());
  if (!bible) return json({ error: 'Could not read a Visual Bible from the site' }, { status: 502 });
  await audit('shorts.bible.rebuild', 'workspace', id);
  return json({ bible });
});
