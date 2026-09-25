import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../../src/server/admin/route';
import { HttpError } from '../../../../../../src/server/http';
import { generateWebsiteDeck } from '../../../../../../src/server/labs/websiteDeck';

// Up to 3 briefs in parallel (2–4 LLM calls each), library search, and AI images for shots the
// library can't cover (10–60 s each, in parallel).
export const maxDuration = 280;

/**
 * POST /api/admin/blitz/slideshow-deck/website
 * Body: { runId }
 * Returns: { deckItems: DeckItem[] } — 6 cards per IDC (max 3 IDCs), interleaved.
 *
 * The engine works from the run's confirmed brand profile. No TikTok research step.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json()) as { runId?: string };
  if (!body.runId) throw new HttpError(400, 'missing_run', 'runId is required.');
  const deckItems = await generateWebsiteDeck(body.runId);
  console.log(`✅ /slideshow-deck/website → ${deckItems.length} cards for run ${body.runId}`);
  return NextResponse.json({ deckItems });
});
