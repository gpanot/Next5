import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../src/server/api';
import { HttpError, readJsonObject } from '../../../../../../src/server/http';
import { getPack, isPackStatus, savePack } from '../../../../../../src/server/shop/listingPacks';
import { toPackDto } from '../../../../../../src/server/shop/packDto';
import { requireWorkspace } from '../../../../../../src/server/workspaces/workspaces';

type Ctx = RouteContext<'/api/app/shop/library/[productId]'>;

const ids = (v: unknown): string[] | undefined => (Array.isArray(v) ? v.map(String) : undefined);

/** GET — the product's listing pack. */
export const GET = authedRoute<Ctx>(async (_req, session, ctx) => {
  const { productId } = await ctx.params;
  const ws = await requireWorkspace(session.userId, 'shop');
  return NextResponse.json({ pack: await toPackDto(ws, await getPack(ws, productId)) });
});

/** PATCH { slotItemIds?, hiddenItemIds?, coverItemId?, status? } — reorder, hide, pick the cover, mark ready/uploaded. */
export const PATCH = authedRoute<Ctx>(async (req, session, ctx) => {
  const { productId } = await ctx.params;
  const body = await readJsonObject(req);
  if (body.status !== undefined && !isPackStatus(body.status)) throw new HttpError(400, 'invalid_status', 'Unknown status.');
  const ws = await requireWorkspace(session.userId, 'shop');
  await savePack(ws, productId, {
    slotItemIds: ids(body.slotItemIds),
    hiddenItemIds: ids(body.hiddenItemIds),
    coverItemId: body.coverItemId === undefined ? undefined : body.coverItemId === null ? null : String(body.coverItemId),
    status: isPackStatus(body.status) ? body.status : undefined,
  });
  return NextResponse.json({ pack: await toPackDto(ws, await getPack(ws, productId)) });
});
