import { after, NextResponse, type NextRequest } from 'next/server';
import { assertRunAccess, labRoute } from '../../../../../../src/server/labs/labAccess';
import { HttpError } from '../../../../../../src/server/http';
import { generateWebsiteDeck } from '../../../../../../src/server/labs/websiteDeck';
import { nextDeckBatch, refillIfLow, savedDeck } from '../../../../../../src/server/labs/workspaceDeck';

// Up to 3 briefs in parallel (2–4 LLM calls each), library search, and AI images for shots the
// library can't cover (10–60 s each, in parallel). The GET's background top-up runs under the same limit.
export const maxDuration = 280;

/**
 * GET /api/admin/blitz/slideshow-deck/website?runId=
 * Workspace users only. Returns: { cards: Array<{ item: DeckItem; status: 'new' | 'kept' | 'edited' }> } — the run's
 * saved cards not swiped away or rendered yet, in deck order. When few unswiped cards are left, the next batch starts
 * building in the background after the response.
 */
export const GET = labRoute(async (req: NextRequest, _ctx: unknown, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'Saved decks belong to workspaces.');
  const runId = req.nextUrl.searchParams.get('runId');
  if (!runId) throw new HttpError(400, 'missing_run', 'runId is required.');
  await assertRunAccess(access, runId);
  const cards = await savedDeck(runId, access.workspaceId);
  after(() => refillIfLow(runId, access.workspaceId));
  return NextResponse.json({ cards });
});

/**
 * POST /api/admin/blitz/slideshow-deck/website
 * Body: { runId, have?: string[] }
 * Returns: { deckItems: DeckItem[] } — 6 cards per IDC (max 3 IDCs), interleaved.
 *
 * The engine works from the run's confirmed brand profile. No TikTok research step.
 * Workspace users: saved unswiped cards not in `have` (a batch built in the background) come first; a new batch is
 * built only when there are none.
 */
export const POST = labRoute(async (req: NextRequest, _ctx: unknown, access) => {
  const body = (await req.json()) as { runId?: string; have?: unknown };
  if (!body.runId) throw new HttpError(400, 'missing_run', 'runId is required.');
  await assertRunAccess(access, body.runId);
  const have = new Set(Array.isArray(body.have) ? body.have.filter((v): v is string => typeof v === 'string') : []);
  const deckItems = access.admin
    ? await generateWebsiteDeck(body.runId)
    : await nextDeckBatch(body.runId, access.workspaceId, have);
  console.log(`✅ /slideshow-deck/website → ${deckItems.length} cards for run ${body.runId}`);
  return NextResponse.json({ deckItems });
});
