/**
 * GET /api/slideshow/me?workspace= — the signed-in user's profile, that workspace and its connected TikTok / Instagram accounts
 * PATCH /api/slideshow/me — { stockImagesOnly?: boolean, aiImagesOnly?: boolean }: the testing switches (STOCK_TEST_EMAILS
 * only). Turning one on turns the other off.
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
    prisma.user.findUniqueOrThrow({ where: { id: user.userId }, select: { displayName: true, stockImagesOnly: true, aiImagesOnly: true } }),
    listSlideshowWorkspaces(user.userId),
    listConnections(workspaceId),
  ]);
  const me: SlideshowMeDto = {
    email: user.email,
    displayName: profile.displayName,
    workspace: workspaces.find((w) => w.id === workspaceId)!,
    connections,
    available: SOCIAL_PROVIDERS.filter((p) => PROVIDERS[p].configured()),
    stockImagesOnly: canTestStockImages(user.email) ? profile.stockImagesOnly : null,
    aiImagesOnly: canTestStockImages(user.email) ? profile.aiImagesOnly : null,
  };
  return NextResponse.json(me);
});

export const PATCH = slideshowRoute(async (req, _ctx: unknown, access) => {
  const user = requireUser(access);
  if (!canTestStockImages(user.email)) throw new HttpError(403, 'forbidden', 'This switch is for testing accounts only.');
  const body = (await req.json().catch(() => ({}))) as { stockImagesOnly?: unknown; aiImagesOnly?: unknown };
  const data = switchUpdate(body);
  const saved = await prisma.user.update({ where: { id: user.userId }, data, select: { stockImagesOnly: true, aiImagesOnly: true } });
  return NextResponse.json(saved);
});

/** The one switch in the body; turning it on turns the other off, since they ask for opposite images. */
function switchUpdate(body: { stockImagesOnly?: unknown; aiImagesOnly?: unknown }): { stockImagesOnly?: boolean; aiImagesOnly?: boolean } {
  if (typeof body.stockImagesOnly === 'boolean') return body.stockImagesOnly ? { stockImagesOnly: true, aiImagesOnly: false } : { stockImagesOnly: false };
  if (typeof body.aiImagesOnly === 'boolean') return body.aiImagesOnly ? { aiImagesOnly: true, stockImagesOnly: false } : { aiImagesOnly: false };
  throw new HttpError(400, 'bad_request', 'stockImagesOnly or aiImagesOnly must be true or false.');
}
