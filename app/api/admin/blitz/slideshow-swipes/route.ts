import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { HttpError } from '../../../../../src/server/http';
import { SWIPE_ACTIONS, logSwipe, type SwipeAction } from '../../../../../src/server/slideshow/core/variants';

type Body = {
  variantId?: string;
  action?: string;
  reason?: string;
  editedShots?: unknown;
  shotTexts?: unknown;
  blitzProjectId?: string;
};

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

/**
 * POST /api/admin/blitz/slideshow-swipes
 * Body: { variantId, action: keep|discard|undo|open|edit|render, reason?, editedShots?, shotTexts?, blitzProjectId? }
 * Logs one deck action and moves the card's status. Returns 204.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json()) as Body;
  if (!body.variantId) throw new HttpError(400, 'missing_variant', 'variantId is required.');
  if (!body.action || !SWIPE_ACTIONS.includes(body.action as SwipeAction)) {
    throw new HttpError(400, 'invalid_action', `action must be one of: ${SWIPE_ACTIONS.join(', ')}`);
  }
  await logSwipe({
    variantId: body.variantId,
    action: body.action as SwipeAction,
    reason: typeof body.reason === 'string' ? body.reason : undefined,
    editedShots: isStringArray(body.editedShots) ? body.editedShots : undefined,
    shotTexts: isStringArray(body.shotTexts) ? body.shotTexts.slice(0, 7) : undefined,
    blitzProjectId: typeof body.blitzProjectId === 'string' ? body.blitzProjectId : undefined,
  });
  return new NextResponse(null, { status: 204 });
});
