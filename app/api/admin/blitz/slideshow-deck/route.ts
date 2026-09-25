import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { HttpError } from '../../../../../src/server/http';
import type { ListingFacts, ReAngle } from '../../../../../src/server/labs/slideshowCopy';
import {
  generateZillowDeck,
  type GenerateDeckInput,
} from '../../../../../src/server/labs/slideshowDeck';

type Body = {
  facts?: ListingFacts;
  angle?: string;
  photoTags?: string[];
  selectedCandidates?: Array<{ id: string; url: string }>;
  listingRunId?: string;
};

const VALID_ANGLES: ReAngle[] = [
  'just_listed', 'price_reduction', 'open_house', 'feature_highlight', 'sold',
];

// 2–3 LLM calls (writeMeat + retry, generateHooks) plus library search.
export const maxDuration = 130;

/**
 * POST /api/admin/blitz/slideshow-deck
 * Body: { facts, angle, photoTags, selectedCandidates }
 * Returns: { deckItems: ZillowDeckItem[] }
 *
 * Generates 6 swipe-deck variants (one per hook archetype) for the given angle.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json()) as Body;

  if (!body.facts) throw new HttpError(400, 'missing_facts', 'facts is required.');
  if (!body.angle || !VALID_ANGLES.includes(body.angle as ReAngle)) {
    throw new HttpError(400, 'invalid_angle', `angle must be one of: ${VALID_ANGLES.join(', ')}`);
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📬 POST /api/admin/blitz/slideshow-deck`);
  console.log(`   engine : zillow (real estate)`);
  console.log(`   angle  : ${body.angle}`);
  console.log(`   address: ${body.facts?.address ?? 'n/a'}`);
  console.log(`   photos : ${(body.selectedCandidates ?? []).length}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  const input: GenerateDeckInput = {
    facts:              body.facts,
    angle:              body.angle as ReAngle,
    photoTags:          body.photoTags ?? [],
    selectedCandidates: body.selectedCandidates ?? [],
    listingRunId:       typeof body.listingRunId === 'string' ? body.listingRunId : null,
  };

  const deckItems = await generateZillowDeck(input);
  console.log(`\n✅ /slideshow-deck → ${deckItems.length} cards for angle="${body.angle}"\n`);
  return NextResponse.json({ deckItems });
});
