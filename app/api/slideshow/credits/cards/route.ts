/**
 * POST   /api/slideshow/credits/cards — { workspaceId } → { url } of a Stripe Checkout page that saves a card (no charge)
 * DELETE /api/slideshow/credits/cards?id=pm_… — removes a saved card
 */
import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../src/server/autoSlideshow/route';
import { requireSlideshowWorkspace } from '../../../../../src/server/autoSlideshow/workspaces';
import { HttpError, readJsonObject } from '../../../../../src/server/http';
import { enforceRateLimit } from '../../../../../src/server/rateLimit';
import { addCardCheckout, removeCard } from '../../../../../src/server/slideshowCredits/stripe';

export const POST = slideshowRoute(async (req, _ctx: unknown, access) => {
  const user = requireUser(access);
  const { workspaceId } = await readJsonObject(req);
  const workspace = await requireSlideshowWorkspace(user.userId, typeof workspaceId === 'string' ? workspaceId : '');
  await enforceRateLimit(`slideshow-checkout:${user.userId}`, 20, 60 * 60);
  return NextResponse.json({ url: await addCardCheckout({ userId: user.userId, email: user.email, workspaceId: workspace.id }) });
});

export const DELETE = slideshowRoute(async (req, _ctx: unknown, access) => {
  const user = requireUser(access);
  const id = new URL(req.url).searchParams.get('id');
  if (!id?.startsWith('pm_')) throw new HttpError(400, 'bad_card', 'Pick a card.');
  await removeCard(user.userId, id);
  return NextResponse.json({ ok: true });
});
