import { NextResponse } from 'next/server';
import { parseMarketCity } from '../../../../../../src/lib/marketPlaces';
import { authedRoute } from '../../../../../../src/server/api';
import { HttpError, readJsonObject } from '../../../../../../src/server/http';
import { cityAt, nearbyCities } from '../../../../../../src/server/realtor/nearbyCities';
import { requireWorkspace } from '../../../../../../src/server/workspaces/workspaces';

/**
 * POST { lat, lng } (she shared her location) or { city, state } (typed or guessed) →
 * { base, nearby }: her city and up to 12 cities around it, closest first.
 */
export const POST = authedRoute(async (req, session) => {
  await requireWorkspace(session.userId, 'brand');
  const body = await readJsonObject(req);
  const hasPoint = typeof body.lat === 'number' && typeof body.lng === 'number';
  const base = hasPoint ? await cityAt(body.lat as number, body.lng as number) : parseMarketCity(body);
  if (!base) {
    throw new HttpError(400, 'no_city', hasPoint ? 'We could not find a US city there. Type your city instead.' : 'Add a city and a state, like Austin, TX.');
  }
  return NextResponse.json({ base, nearby: await nearbyCities(base) });
});
