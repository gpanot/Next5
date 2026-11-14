// server-only — never import from a 'use client' file.
// "Where do you sell?": her city from the device location (or the IP), and the cities around it, closest first.
// The nearby list is one gpt-5.4-nano call per base city, cached forever in market_snapshots (kind 'nearby').

import { prisma } from '../../lib/db';
import { cityId, parseMarketCity, type MarketCity } from '../../lib/marketPlaces';
import { chatJson, isOpenAiEnabled } from '../ai/openai';

const MODEL = 'gpt-5.4-nano';
const NEARBY = 12;
const KIND = 'nearby';
const PERIOD = 'v1';

const keys = Array.from({ length: NEARBY }, (_, i) => `"c${i + 1}City":"","c${i + 1}State":""`).join(',');

const prompt = (base: MarketCity) =>
  [
    `List the ${NEARBY} US cities or towns closest to ${base.city}, ${base.state} where a real estate agent from there could also sell homes.`,
    'Closest first. Each must have at least 15,000 people. Do not include the city itself. Use real place names only.',
    `State = 2-letter code. Return only JSON with flat keys: {${keys}}`,
  ].join('\n');

/** Flat keys (nano drops nested fields) → cities, without the base and duplicates. */
const citiesFrom = (raw: Record<string, unknown> | null, base: MarketCity): MarketCity[] => {
  if (!raw) return [];
  const seen = new Set([cityId(base)]);
  const out: MarketCity[] = [];
  for (let i = 1; i <= NEARBY; i++) {
    const c = parseMarketCity({ city: raw[`c${i}City`], state: raw[`c${i}State`] });
    if (c && !seen.has(cityId(c))) {
      seen.add(cityId(c));
      out.push(c);
    }
  }
  return out;
};

/** Up to 12 cities around `base`, closest first. Empty when OpenAI is off or fails (she can still type cities). */
export const nearbyCities = async (base: MarketCity): Promise<MarketCity[]> => {
  const areaKey = cityId(base);
  const where = { areaKey_kind_period: { areaKey, kind: KIND, period: PERIOD } };
  const cached = await prisma.marketSnapshot.findUnique({ where });
  if (cached) return (cached.items as MarketCity[]) ?? [];
  if (!isOpenAiEnabled()) return [];
  const raw = await chatJson<Record<string, unknown>>([{ role: 'user', content: prompt(base) }], {
    model: MODEL, maxTokens: 1500, reasoningEffort: 'none', timeoutMs: 20_000,
  });
  const cities = citiesFrom(raw, base);
  if (cities.length > 0) {
    await prisma.marketSnapshot.upsert({ where, create: { areaKey, kind: KIND, period: PERIOD, items: cities }, update: { items: cities } });
  }
  return cities;
};

type NominatimAddress = { city?: string; town?: string; village?: string; hamlet?: string; county?: string; 'ISO3166-2-lvl4'?: string; country_code?: string };

/** The US city at a point (OpenStreetMap Nominatim, free, no key). Null outside the US or on failure. */
export const cityAt = async (lat: number, lng: number): Promise<MarketCity | null> => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&addressdetails=1&lat=${lat.toFixed(3)}&lon=${lng.toFixed(3)}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Next5/1.0 (market-update)', 'Accept-Language': 'en' }, signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const body = (await res.json()) as { address?: NominatimAddress };
    const a = body.address;
    if (!a || a.country_code !== 'us') return null;
    const state = a['ISO3166-2-lvl4']?.replace(/^US-/, '');
    return parseMarketCity({ city: a.city ?? a.town ?? a.village ?? a.hamlet ?? a.county, state });
  } catch {
    return null;
  }
};

/** Vercel's IP location headers: a city guess with no prompt. Null on localhost or outside the US. */
export const cityFromIp = (headers: Headers): MarketCity | null => {
  if (headers.get('x-vercel-ip-country') !== 'US') return null;
  const city = headers.get('x-vercel-ip-city');
  return parseMarketCity({ city: city ? decodeURIComponent(city) : '', state: headers.get('x-vercel-ip-country-region') });
};
