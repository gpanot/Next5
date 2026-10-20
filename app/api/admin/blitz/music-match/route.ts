import { NextResponse, type NextRequest } from 'next/server';
import { labRoute } from '../../../../../src/server/labs/labAccess';
import { blitzBrowserUrl } from '../../../../../src/server/admin/blitzStore';
import { matchTracks } from '../../../../../src/server/autoSlideshow/music';
import { HttpError } from '../../../../../src/server/http';

type CardBody = { id: string; texts: string[]; audience?: string };

const MAX_CARDS = 30;

/**
 * POST /api/admin/blitz/music-match
 * Body: { cards: [{ id, texts, audience? }] }
 * Returns: { picks: [{ id, assetKey, url, startAt, label, recommended }] }
 *
 * The same music pick as slideshows and calendar ideas (matchTracks): random, skipping what the
 * workspace used lately, all different while the library has enough. `recommended` is always false.
 */
export const POST = labRoute(async (req: NextRequest, _ctx: unknown, access) => {
  const body = (await req.json().catch(() => ({}))) as { cards?: CardBody[] };
  const cards = (body.cards ?? []).filter((c) => c?.id && Array.isArray(c.texts)).slice(0, MAX_CARDS);
  if (cards.length === 0) throw new HttpError(400, 'missing_cards', 'cards is required.');

  const matches = await matchTracks(cards.length, access.workspaceId);

  const picks = await Promise.all(matches.map(async (m, i) => (
    { id: cards[i]!.id, assetKey: m.r2Key, url: await blitzBrowserUrl(m.r2Key), startAt: m.startAt, label: m.name, recommended: false }
  )));
  return NextResponse.json({ picks });
});
