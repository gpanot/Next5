import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../../src/server/admin/route';
import { HttpError } from '../../../../../../src/server/http';
import type { ListingFacts } from '../../../../../../src/server/labs/slideshowCopy';
import { loadWebsiteSource } from '../../../../../../src/server/labs/websiteDeck';
import { websiteEngine } from '../../../../../../src/server/slideshow/engines/website/engine';
import { checkEditedShots as checkWebsiteShots } from '../../../../../../src/server/slideshow/engines/website/guardrails';
import { checkEditedShots as checkListingShots } from '../../../../../../src/server/slideshow/engines/zillow/guardrails';

type Body =
  | { engine?: 'zillow'; facts?: ListingFacts; texts?: unknown }
  | { engine: 'website'; runId?: string; texts?: unknown };

/**
 * POST /api/admin/blitz/slideshow-deck/check
 * Body: { engine: 'zillow', facts, texts } | { engine: 'website', runId, texts }   (texts: string[7])
 * Returns: { problems: string[] } — empty means the edited card may render.
 *
 * Same guardrails as generation plus the 7-shot format, so a user edit cannot ship what the
 * engine would reject (invented numbers, Fair Housing, unprovable claims, competitor names…).
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json()) as Body;
  if (!Array.isArray(body.texts) || !body.texts.every((t) => typeof t === 'string')) {
    throw new HttpError(400, 'invalid_texts', 'texts must be an array of strings.');
  }
  const texts = body.texts as string[];

  if (body.engine === 'website') {
    if (!body.runId) throw new HttpError(400, 'missing_run', 'runId is required.');
    const brief = websiteEngine.briefs(await loadWebsiteSource(body.runId))[0];
    if (!brief) throw new HttpError(409, 'no_brief', 'The profile has no audience to check against.');
    return NextResponse.json({ problems: checkWebsiteShots(texts, brief.facts) });
  }

  if (!body.facts) throw new HttpError(400, 'missing_facts', 'facts is required.');
  const facts = body.facts;
  return NextResponse.json({
    problems: checkListingShots(texts, { ...facts, priceHistory: facts.priceHistory ?? undefined }),
  });
});
