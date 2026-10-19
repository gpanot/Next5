/**
 * POST /api/prospect/[token]/claim — the signed-in user takes the pack: its workspace becomes theirs → { workspaceId }.
 * Needs a session (the magic link from the review page's "Get my posts"). Someone who already paid gets days 8-14 made
 * in full right away (prospects/unlock.ts).
 */
import { json } from '../../../../../src/server/admin/route';
import { requireUser } from '../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../src/server/autoSlideshow/route';
import { HttpError } from '../../../../../src/server/http';
import { claimProspect } from '../../../../../src/server/prospects/claim';
import { unlockIfPaid } from '../../../../../src/server/prospects/unlock';

type Ctx = RouteContext<'/api/prospect/[token]/claim'>;

export const POST = slideshowRoute<Ctx>(async (_req, ctx, access) => {
  const { token } = await ctx.params;
  const user = requireUser(access);
  if (user.impersonated) throw new HttpError(403, 'impersonated', 'Sign in as yourself to take these posts.');
  const workspaceId = await claimProspect(token, user.userId);
  await unlockIfPaid(user.userId, workspaceId);
  return json({ workspaceId });
});
