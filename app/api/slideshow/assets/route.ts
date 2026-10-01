/**
 * GET    /api/slideshow/assets?workspace= — every photo generated in the user's runs (newest run first), broken ones included
 * DELETE /api/slideshow/assets?workspace= — { items: [{ runId, index }] } → delete those photos
 */
import { NextResponse } from 'next/server';
import { requireUser, workspaceParam } from '../../../../src/server/autoSlideshow/access';
import { deleteAssets, listAssets, type AssetRef } from '../../../../src/server/autoSlideshow/assets';
import { slideshowRoute } from '../../../../src/server/autoSlideshow/route';
import { HttpError } from '../../../../src/server/http';

export const GET = slideshowRoute(async (req, _ctx: unknown, access) => NextResponse.json({ assets: await listAssets(await workspaceParam(req, requireUser(access))) }));

const isRef = (v: unknown): v is AssetRef => {
  const r = v as Partial<AssetRef> | null;
  return typeof r?.runId === 'string' && Number.isInteger(r.index) && (r.index as number) >= 0;
};

export const DELETE = slideshowRoute(async (req, _ctx: unknown, access) => {
  const workspaceId = await workspaceParam(req, requireUser(access));
  const body = (await req.json().catch(() => ({}))) as { items?: unknown };
  if (!Array.isArray(body.items) || body.items.length === 0 || !body.items.every(isRef)) throw new HttpError(400, 'bad_items', 'Pick at least one photo.');
  return NextResponse.json({ removed: await deleteAssets(workspaceId, body.items) });
});
