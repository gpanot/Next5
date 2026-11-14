import { NextResponse } from 'next/server';
import { parseMarketPlaces, storedMarketArea } from '../../../../../src/lib/marketPlaces';
import { prisma } from '../../../../../src/lib/db';
import { authedRoute } from '../../../../../src/server/api';
import { busyDates } from '../../../../../src/server/campaigns/playbookPlan';
import { cityFromIp } from '../../../../../src/server/realtor/nearbyCities';
import { getActivePlan } from '../../../../../src/server/generation/createBatch';
import { HttpError, readJsonObject } from '../../../../../src/server/http';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

/** How far ahead the post dates are suggested from. */
const BUSY_DAYS = 42;

type Address = { city?: string | null; state?: string | null };

/** Her imported listings' most common city: the prefill for "Where do you sell?". */
const suggestedArea = async (workspaceId: string) => {
  const rows = await prisma.listing.findMany({ where: { workspaceId, archivedAt: null }, select: { address: true }, take: 50 });
  const counts = new Map<string, { city: string; state: string; n: number }>();
  for (const r of rows) {
    const a = (r.address ?? {}) as Address;
    if (!a.city || !a.state) continue;
    const key = `${a.city}|${a.state}`;
    counts.set(key, { city: a.city, state: a.state, n: (counts.get(key)?.n ?? 0) + 1 });
  }
  const best = [...counts.values()].sort((x, y) => y.n - x.n)[0];
  return best ? { city: best.city, state: best.state } : null;
};

/**
 * GET — her saved places, else a base city guessed with no prompt (her listings' city, else her IP city), whether
 * market updates are open to her plan, her brokerage line, and the days of the next 6 weeks that already hold a post.
 */
export const GET = authedRoute(async (req, session) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const today = new Date().toISOString().slice(0, 10);
  const [plan, fromListings, busy] = await Promise.all([getActivePlan(ws.id), suggestedArea(ws.id), busyDates(ws.id, today, BUSY_DAYS)]);
  return NextResponse.json({
    places: parseMarketPlaces(ws.marketArea), busyDates: [...busy].sort(), suggestedBase: fromListings ?? cityFromIp(req.headers), paid: Boolean(plan),
    disclosure: { agentName: ws.agentName ?? '', brokerage: ws.brokerage ?? '' },
  });
});

/** PUT { cities: [{ city, state }] (up to 3), state: 'TX' | null } — "Where do you sell?". */
export const PUT = authedRoute(async (req, session) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const body = await readJsonObject(req);
  const places = parseMarketPlaces({ cities: Array.isArray(body.cities) ? body.cities : [], stateArea: body.state ?? null });
  if (!places) throw new HttpError(400, 'invalid_area', 'Add at least one city (like Austin, TX) or your state.');
  await prisma.workspace.update({ where: { id: ws.id }, data: { marketArea: storedMarketArea(places) } });
  return NextResponse.json({ places });
});
