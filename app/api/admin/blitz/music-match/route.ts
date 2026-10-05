import { NextResponse, type NextRequest } from 'next/server';
import { labRoute } from '../../../../../src/server/labs/labAccess';
import { blitzBrowserUrl } from '../../../../../src/server/admin/blitzStore';
import { matchTracks } from '../../../../../src/server/autoSlideshow/music';
import { HttpError } from '../../../../../src/server/http';

// One Jev call per (card, described track) pair, 24 in parallel.
export const maxDuration = 120;

type CardBody = { id: string; texts: string[]; audience?: string };

const MAX_CARDS = 30;

/**
 * POST /api/admin/blitz/music-match
 * Body: { cards: [{ id, texts, audience? }] }
 * Returns: { picks: [{ id, assetKey, url, startAt, label, recommended }] }
 *
 * The same music pick as slideshows and calendar ideas (matchTracks): Jev fit, minus what the
 * workspace used lately, all different while the library has enough. `recommended` is false
 * when Jev was unavailable.
 */
export const POST = labRoute(async (req: NextRequest, _ctx: unknown, access) => {
  const body = (await req.json().catch(() => ({}))) as { cards?: CardBody[] };
  const cards = (body.cards ?? []).filter((c) => c?.id && Array.isArray(c.texts)).slice(0, MAX_CARDS);
  if (cards.length === 0) throw new HttpError(400, 'missing_cards', 'cards is required.');

  const shows = cards.map((c) => ({
    goal: null,
    audience: c.audience?.slice(0, 200),
    slides: c.texts.map((t) => ({ title: String(t).slice(0, 300), body: '' })),
  }));
  const matches = await matchTracks(shows, null, access.workspaceId);

  const picks = await Promise.all(matches.map(async (m, i) => (
    { id: cards[i]!.id, assetKey: m.r2Key, url: await blitzBrowserUrl(m.r2Key), startAt: m.startAt, label: m.name, recommended: m.recommended }
  )));
  return NextResponse.json({ picks });
});
