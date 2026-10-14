import { after, NextResponse, type NextRequest } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { assertOwned, labRoute } from '../../../../../src/server/labs/labAccess';
import { HttpError } from '../../../../../src/server/http';
import { refillAfterSwipe } from '../../../../../src/server/labs/workspaceDeck';
import { SWIPE_ACTIONS, logSwipe, type ShotEdit, type SwipeAction } from '../../../../../src/server/slideshow/core/variants';

// A keep or skip that leaves few cards on a workspace deck builds the next batch after the response (30–90 s).
export const maxDuration = 280;

/** Actions that take a card off the deck. */
const LEAVES_DECK: ReadonlySet<SwipeAction> = new Set(['keep', 'discard']);

type Body = {
  variantId?: string;
  action?: string;
  reason?: string;
  editedShots?: unknown;
  shotTexts?: unknown;
  shotEdits?: unknown;
  blitzProjectId?: string;
};

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

const str = (v: unknown, max: number) => (typeof v === 'string' && v.length > 0 && v.length <= max ? v : undefined);
const num = (v: unknown, min: number, max: number) => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : undefined);

/** One shot's edit from the body, keeping only well-formed fields. */
const toShotEdit = (v: unknown): ShotEdit => {
  const r = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return {
    assetKey: str(r.assetKey, 500),
    trimStart: num(r.trimStart, 0, 3600),
    positionY: num(r.positionY, 0, 1),
    mediaUrl: str(r.mediaUrl, 2000),
    mediaKind: r.mediaKind === 'image' || r.mediaKind === 'video' ? r.mediaKind : undefined,
    mediaLabel: str(r.mediaLabel, 200),
  };
};

/**
 * POST /api/admin/blitz/slideshow-swipes
 * Body: { variantId, action: keep|discard|undo|open|edit|render, reason?, editedShots?, shotTexts?, shotEdits?, blitzProjectId? }
 * Logs one deck action and moves the card's status. Returns 204.
 */
export const POST = labRoute(async (req: NextRequest, _ctx: unknown, access) => {
  const body = (await req.json()) as Body;
  if (!body.variantId) throw new HttpError(400, 'missing_variant', 'variantId is required.');
  if (!access.admin) {
    const variant = await prisma.slideshowVariant.findUnique({ where: { id: body.variantId }, select: { workspaceId: true } });
    assertOwned(access, variant?.workspaceId, 'Card');
  }
  if (!body.action || !SWIPE_ACTIONS.includes(body.action as SwipeAction)) {
    throw new HttpError(400, 'invalid_action', `action must be one of: ${SWIPE_ACTIONS.join(', ')}`);
  }
  await logSwipe({
    variantId: body.variantId,
    action: body.action as SwipeAction,
    reason: typeof body.reason === 'string' ? body.reason : undefined,
    editedShots: isStringArray(body.editedShots) ? body.editedShots : undefined,
    shotTexts: isStringArray(body.shotTexts) ? body.shotTexts.slice(0, 7) : undefined,
    shotEdits: Array.isArray(body.shotEdits) ? body.shotEdits.slice(0, 7).map(toShotEdit) : undefined,
    blitzProjectId: typeof body.blitzProjectId === 'string' ? body.blitzProjectId : undefined,
  });
  const variantId = body.variantId;
  if (!access.admin && LEAVES_DECK.has(body.action as SwipeAction) && !body.reason) {
    after(() => refillAfterSwipe(variantId).catch((err: unknown) => console.error('[slideshow-swipes] refill check failed:', err)));
  }
  return new NextResponse(null, { status: 204 });
});
