// Pure: the Autopilot UI and the server share the "Where do you sell?" shape and the cache keys.
// Plan: docs/business-studios/15-realtor-autopilot-plan.md §4.6, §4.8.

export type MarketArea = { city: string; state: string; zips: string[]; neighborhoods: string[] };

const MAX_EXTRAS = 3;
const ZIP = /^\d{5}$/;

const clean = (value: unknown, max: number): string => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** A valid area from untrusted input, or null. State = 2-letter code. Up to 3 zips and 3 neighborhoods. */
export const parseMarketArea = (raw: unknown): MarketArea | null => {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const city = clean(r.city, 60);
  const state = clean(r.state, 3).toUpperCase();
  if (!city || !/^[A-Z]{2}$/.test(state)) return null;
  const list = (v: unknown) => (Array.isArray(v) ? v.map((x) => clean(x, 40)).filter(Boolean) : []);
  return {
    city,
    state,
    zips: [...new Set(list(r.zips).filter((z) => ZIP.test(z)))].slice(0, MAX_EXTRAS),
    neighborhoods: [...new Set(list(r.neighborhoods))].slice(0, MAX_EXTRAS),
  };
};

/** Same area, same key, whatever the casing or order of zips: agents in one city share one research call. */
export const areaKey = (a: MarketArea): string =>
  [a.city.toLowerCase(), a.state.toLowerCase(), [...a.zips].sort().join(','), [...a.neighborhoods].map((n) => n.toLowerCase()).sort().join(',')].join('|');

export const areaLabel = (a: MarketArea): string => `${a.city}, ${a.state}`;

/** ISO week, e.g. "2026-W46": one market snapshot per area per week. */
export const isoWeek = (date: Date): string => {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

/** The weekly angle rotates so two weeks in a row never read the same (§4.6). */
export const ANGLES = ['buyers', 'sellers', 'rates', 'inventory'] as const;
export type Angle = (typeof ANGLES)[number];
export const angleOf = (period: string): Angle => ANGLES[Number(period.slice(-2)) % ANGLES.length]!;
