import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { adminRoute } from '../../../../../src/server/admin/route';
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
 * The same Jev pass the Auto Slideshow runs: the best-fitting shared track per deck card, all
 * different while the library has enough. `recommended` is false when Jev was unavailable and
 * the pick is random.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as { cards?: CardBody[] };
  const cards = (body.cards ?? []).filter((c) => c?.id && Array.isArray(c.texts)).slice(0, MAX_CARDS);
  if (cards.length === 0) throw new HttpError(400, 'missing_cards', 'cards is required.');

  const shows = cards.map((c) => ({
    goal: null,
    audience: c.audience?.slice(0, 200),
    slides: c.texts.map((t) => ({ title: String(t).slice(0, 300), body: '' })),
  }));
  const matches = await matchTracks(shows, null);

  const assets = await prisma.blitzAsset.findMany({ where: { id: { in: matches.map((m) => m.assetId) } } });
  const picks = await Promise.all(matches.map(async (m, i) => {
    const asset = assets.find((a) => a.id === m.assetId);
    if (!asset) return null;
    return { id: cards[i]!.id, assetKey: asset.r2Key, url: await blitzBrowserUrl(asset.r2Key), startAt: m.startAt, label: asset.name, recommended: m.recommended };
  }));
  return NextResponse.json({ picks: picks.filter((p) => p !== null) });
});
