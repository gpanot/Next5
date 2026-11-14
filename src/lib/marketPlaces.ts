// Pure: Market update covers up to 3 cities + 1 state, one post each, every 2 days.
// Stored on Workspace.marketArea next to the legacy single-area fields (src/lib/marketArea.ts).

import type { MarketArea } from './marketArea';

export type MarketCity = { city: string; state: string };
/** `state` = the 2-letter state covered by its own post, or null when she removed it. */
export type MarketPlaces = { cities: MarketCity[]; state: string | null };

export const MAX_CITIES = 3;

export const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  DC: 'Washington, D.C.', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

const clean = (value: unknown, max: number): string => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** "TX", "tx" or "Texas" → "TX"; anything else → null. */
export const stateCode = (value: unknown): string | null => {
  const v = clean(value, 30);
  const upper = v.toUpperCase();
  if (US_STATES[upper]) return upper;
  const hit = Object.entries(US_STATES).find(([, name]) => name.toLowerCase() === v.toLowerCase());
  return hit ? hit[0] : null;
};

export const cityId = (c: MarketCity): string => `${c.city.toLowerCase()}|${c.state}`;

/** A valid city from untrusted input, or null. */
export const parseMarketCity = (raw: unknown): MarketCity | null => {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const city = clean(r.city, 60);
  const state = stateCode(r.state);
  return city.length > 1 && state ? { city, state } : null;
};

const uniqueCities = (list: unknown[]): MarketCity[] => {
  const seen = new Set<string>();
  const out: MarketCity[] = [];
  for (const raw of list) {
    const c = parseMarketCity(raw);
    if (c && !seen.has(cityId(c))) {
      seen.add(cityId(c));
      out.push(c);
    }
  }
  return out.slice(0, MAX_CITIES);
};

/** Her places from the stored JSON. Older rows (one city) read as that city + its state. */
export const parseMarketPlaces = (raw: unknown): MarketPlaces | null => {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.cities)) {
    const cities = uniqueCities(r.cities);
    const state = r.stateArea === null ? null : stateCode(r.stateArea);
    return cities.length || state ? { cities, state } : null;
  }
  const legacy = parseMarketCity(r);
  return legacy ? { cities: [legacy], state: legacy.state } : null;
};

/** What goes in Workspace.marketArea: the places plus the legacy fields (first city) that tips and spotlights read. */
export const storedMarketArea = (p: MarketPlaces) => {
  const first = p.cities[0];
  return { city: first?.city ?? '', state: first?.state ?? p.state ?? '', zips: [], neighborhoods: [], cities: p.cities, stateArea: p.state };
};

export const placeCount = (p: MarketPlaces | null): number => (p ? p.cities.length + (p.state ? 1 : 0) : 0);

/** A city or a whole state as the research and the cards read it. A state has city ''. */
export const areaOfCity = (c: MarketCity): MarketArea => ({ city: c.city, state: c.state, zips: [], neighborhoods: [] });
export const areaOfState = (state: string): MarketArea => ({ city: '', state, zips: [], neighborhoods: [] });

/** "Austin" for a city, "Texas" for a whole state. */
export const placeName = (a: MarketArea): string => a.city || US_STATES[a.state] || a.state;

/** Beat keys in order: market_update.stats, .stats_2, .stats_3 for the cities, .state for the state. */
export const CITY_BEATS = ['market_update.stats', 'market_update.stats_2', 'market_update.stats_3'] as const;
export const STATE_BEAT = 'market_update.state';

/** Which place a market update post covers, from its beat key. */
export const areaForBeat = (p: MarketPlaces, beatKey: string | null | undefined): MarketArea | null => {
  if (beatKey === STATE_BEAT) return p.state ? areaOfState(p.state) : null;
  const i = CITY_BEATS.indexOf(beatKey as (typeof CITY_BEATS)[number]);
  const city = i >= 0 ? p.cities[i] : undefined;
  return city ? areaOfCity(city) : null;
};

/** The beat keys her places use, in posting order. */
export const beatKeysFor = (p: MarketPlaces): string[] => [...CITY_BEATS.slice(0, p.cities.length), ...(p.state ? [STATE_BEAT] : [])];
