/**
 * GET /api/slideshow/me?workspace= — the signed-in user's profile, that workspace and its connected TikTok / Instagram accounts
 * PATCH /api/slideshow/me — { approvalEmailEnabled: boolean }: the 8 am approval email (any user). Or
 * { stockImagesOnly?: boolean, aiImagesOnly?: boolean, hooksVolumeStockOnly?: boolean }: the testing switches
 * (STOCK_TEST_EMAILS only). Turning one of the Blitz two on turns the other off.
 */
import { NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/db';
import { requireUser, workspaceParam } from '../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../src/server/autoSlideshow/route';
import { HttpError } from '../../../../src/server/http';
import { canTestStockImages } from '../../../../src/server/slideshowCredits/paid';
import { listSlideshowWorkspaces } from '../../../../src/server/autoSlideshow/workspaces';
import { listConnections, PROVIDERS } from '../../../../src/server/social/connections';
import { SOCIAL_PROVIDERS } from '../../../../src/server/social/types';
import type { SlideshowMeDto } from '../../../../src/types/admin/autoSlideshow';

export const GET = slideshowRoute(async (req, _ctx: unknown, access) => {
  const user = requireUser(access);
  const workspaceId = await workspaceParam(req, user);
  const [profile, workspaces, connections] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: user.userId }, select: { displayName: true, approvalEmailEnabled: true, stockImagesOnly: true, aiImagesOnly: true, hooksVolumeStockOnly: true } }),
    listSlideshowWorkspaces(user.userId),
    listConnections(workspaceId),
  ]);
  const me: SlideshowMeDto = {
    email: user.email,
    displayName: profile.displayName,
    workspace: workspaces.find((w) => w.id === workspaceId)!,
    connections,
    available: SOCIAL_PROVIDERS.filter((p) => PROVIDERS[p].configured()),
    approvalEmailEnabled: profile.approvalEmailEnabled,
    stockImagesOnly: canTestStockImages(user.email) ? profile.stockImagesOnly : null,
    aiImagesOnly: canTestStockImages(user.email) ? profile.aiImagesOnly : null,
    hooksVolumeStockOnly: canTestStockImages(user.email) ? profile.hooksVolumeStockOnly : null,
  };
  return NextResponse.json(me);
});

export const PATCH = slideshowRoute(async (req, _ctx: unknown, access) => {
  const user = requireUser(access);
  const body = (await req.json().catch(() => ({}))) as SwitchBody;
  if (typeof body.approvalEmailEnabled === 'boolean') {
    const saved = await prisma.user.update({ where: { id: user.userId }, data: { approvalEmailEnabled: body.approvalEmailEnabled }, select: { approvalEmailEnabled: true } });
    return NextResponse.json(saved);
  }
  if (!canTestStockImages(user.email)) throw new HttpError(403, 'forbidden', 'This switch is for testing accounts only.');
  const data = switchUpdate(body);
  const saved = await prisma.user.update({ where: { id: user.userId }, data, select: { stockImagesOnly: true, aiImagesOnly: true, hooksVolumeStockOnly: true } });
  return NextResponse.json(saved);
});

type SwitchBody = { approvalEmailEnabled?: unknown; stockImagesOnly?: unknown; aiImagesOnly?: unknown; hooksVolumeStockOnly?: unknown };

/** The one switch in the body; turning a Blitz one on turns the other off, since they ask for opposite images. */
function switchUpdate(body: SwitchBody): { stockImagesOnly?: boolean; aiImagesOnly?: boolean; hooksVolumeStockOnly?: boolean } {
  if (typeof body.hooksVolumeStockOnly === 'boolean') return { hooksVolumeStockOnly: body.hooksVolumeStockOnly };
  if (typeof body.stockImagesOnly === 'boolean') return body.stockImagesOnly ? { stockImagesOnly: true, aiImagesOnly: false } : { stockImagesOnly: false };
  if (typeof body.aiImagesOnly === 'boolean') return body.aiImagesOnly ? { aiImagesOnly: true, stockImagesOnly: false } : { aiImagesOnly: false };
  throw new HttpError(400, 'bad_request', 'stockImagesOnly, aiImagesOnly or hooksVolumeStockOnly must be true or false.');
}
