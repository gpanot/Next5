/**
 * GET  /api/admin/credits?q= — Auto Slideshow users with their credit balance (filter by email)
 * POST /api/admin/credits — { userId, amountCents (negative removes), note } → adds credits by hand; returns the new balance
 */
import { adminRoute, audit, json } from '../../../../src/server/admin/route';
import { readJsonObject } from '../../../../src/server/http';
import { adjustCredits, listCreditUsers } from '../../../../src/server/slideshowCredits/admin';

export const GET = adminRoute(async (req) => json({ users: await listCreditUsers(new URL(req.url).searchParams.get('q') ?? '') }));

export const POST = adminRoute(async (req) => {
  const body = await readJsonObject(req);
  const userId = typeof body.userId === 'string' ? body.userId : '';
  const balanceCents = await adjustCredits(userId, body.amountCents, body.note);
  await audit('slideshow_credits.adjust', 'user', userId, { amountCents: body.amountCents as number, note: String(body.note) });
  return json({ balanceCents });
});
