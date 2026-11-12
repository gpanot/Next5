import { NextResponse } from 'next/server';
import { parseMarketArea } from '../../../../../src/lib/marketArea';
import { prisma } from '../../../../../src/lib/db';
import { authedRoute } from '../../../../../src/server/api';
import { getActivePlan } from '../../../../../src/server/generation/createBatch';
import { HttpError, readJsonObject } from '../../../../../src/server/http';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

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
  return best ? { city: best.city, state: best.state, zips: [], neighborhoods: [] } : null;
};

/** GET — her market area (or a suggestion from her listings), whether market updates are open to her plan, and her brokerage line. */
export const GET = authedRoute(async (_req, session) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const [plan, suggested] = await Promise.all([getActivePlan(ws.id), suggestedArea(ws.id)]);
  return NextResponse.json({
    marketArea: parseMarketArea(ws.marketArea), suggested, paid: Boolean(plan),
    disclosure: { agentName: ws.agentName ?? '', brokerage: ws.brokerage ?? '' },
  });
});

/** PUT { city, state, zips?, neighborhoods? } — "Where do you sell?". */
export const PUT = authedRoute(async (req, session) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const area = parseMarketArea(await readJsonObject(req));
  if (!area) throw new HttpError(400, 'invalid_area', 'Add a city and a 2-letter state, like Austin, TX.');
  await prisma.workspace.update({ where: { id: ws.id }, data: { marketArea: area } });
  return NextResponse.json({ marketArea: area });
});
