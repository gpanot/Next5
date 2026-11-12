// server-only — never import from a 'use client' file.
// "What is 5 minutes away": gpt-5.4-mini with OpenAI's web_search tool (docs/business-studios/15-realtor-autopilot-plan.md §4.7).
// The model alone has no live map data and would invent places, so a place is kept only with a source URL.
// Cached 90 days per address in market_snapshots (kind 'neighborhood'), so a second playbook for the same home is free.

import { prisma } from '../../lib/db';
import { jsonObjectIn, webSearchText } from '../ai/openaiWebSearch';
import { fairHousingHits } from '../compliance/fairHousing';

const ALLOWED = ['park', 'coffee', 'grocery', 'restaurant', 'gym', 'trail', 'transit', 'shopping', 'lake', 'beach', 'market'];
const MAX_PLACES = 5;
const CACHE_MS = 90 * 86_400_000;
const PERIOD = 'nbhd';

export type NearbyPlace = { name: string; type: string; minutes: number; mode: 'drive' | 'walk'; sourceUrl: string };

const PROMPT = (address: string) => `Find ${MAX_PLACES} real, currently open places within about 5 minutes of this home: ${address}.
Use web search. Allowed types: ${ALLOWED.join(', ')}. Never schools, places of worship, or anything about who lives there or how safe it is.
Return only JSON, flat keys, no prose:
{"p1Name":"","p1Type":"","p1Minutes":0,"p1Mode":"drive","p1Url":"", ... up to p5}
minutes = approximate travel time; mode = "walk" or "drive"; url = the page you found it on.`;

const SPOTS_PROMPT = (area: string) => `Find ${MAX_PLACES} real, currently open local favorites in ${area}: a mix of parks, coffee, markets, trails and restaurants.
Use web search. Allowed types: ${ALLOWED.join(', ')}. Never schools, places of worship, or anything about who lives there or how safe it is.
Return only JSON, flat keys, no prose:
{"p1Name":"","p1Type":"","p1Minutes":0,"p1Mode":"drive","p1Url":"", ... up to p5}
minutes = 0 (not used); url = the page you found it on.`;

const parsePlaces = (raw: Record<string, unknown> | null, needMinutes = true): NearbyPlace[] => {
  if (!raw) return [];
  const places: NearbyPlace[] = [];
  for (let i = 1; i <= MAX_PLACES; i++) {
    const name = String(raw[`p${i}Name`] ?? '').trim();
    const type = String(raw[`p${i}Type`] ?? '').trim().toLowerCase();
    const url = String(raw[`p${i}Url`] ?? '').trim();
    const minutes = Math.round(Number(raw[`p${i}Minutes`]));
    if (!name || !/^https?:\/\//.test(url) || !ALLOWED.includes(type)) continue;
    if (needMinutes && !(minutes > 0 && minutes <= 12)) continue;
    if (fairHousingHits(name).length > 0) continue;
    places.push({ name, type, minutes: needMinutes ? minutes : 0, mode: raw[`p${i}Mode`] === 'walk' ? 'walk' : 'drive', sourceUrl: url });
  }
  return places;
};

const keyOf = (address: string) => address.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Up to 5 sourced places near the address; [] when search is off, fails, or finds nothing it can source. */
export const nearbyPlaces = (address: string, now = new Date()): Promise<NearbyPlace[]> => cachedPlaces(address, false, now);

/** Up to 5 sourced local favorites in her market area ("Austin, TX") for the evergreen spotlight. */
export const localSpots = (area: string, now = new Date()): Promise<NearbyPlace[]> => cachedPlaces(area, true, now);

const cachedPlaces = async (address: string, isArea: boolean, now: Date): Promise<NearbyPlace[]> => {
  if (!address) return [];
  const areaKey = `${isArea ? 'area:' : ''}${keyOf(address)}`;
  const where = { areaKey_kind_period: { areaKey, kind: 'neighborhood', period: PERIOD } };
  const cached = await prisma.marketSnapshot.findUnique({ where });
  if (cached && now.getTime() - cached.createdAt.getTime() < CACHE_MS && Array.isArray(cached.items) && cached.items.length > 0) {
    return cached.items as NearbyPlace[];
  }
  const reply = await webSearchText(isArea ? SPOTS_PROMPT(address) : PROMPT(address), { tag: 'neighborhood', timeoutMs: 90_000 });
  const places = parsePlaces(reply ? jsonObjectIn(reply.text) : null, !isArea);
  if (places.length > 0) {
    await prisma.marketSnapshot.upsert({
      where,
      create: { areaKey, kind: 'neighborhood', period: PERIOD, items: places, costUsdMicros: reply?.usdMicros ?? 0 },
      update: { items: places, costUsdMicros: reply?.usdMicros ?? 0, createdAt: now },
    });
  }
  return places;
};
