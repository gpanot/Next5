// Pure: the "Where do you sell?" draft and its moves (first suggestion, suggest more, add, remove).

import { cityId, MAX_CITIES, type MarketCity, type MarketPlaces } from '../../../lib/marketPlaces';

/** Her picks plus what "Suggest more cities" rotates through. `shown` = city ids already offered. */
export type PlacesDraft = MarketPlaces & { base: MarketCity | null; nearby: MarketCity[]; shown: string[] };

export const emptyDraft = (): PlacesDraft => ({ cities: [], state: null, base: null, nearby: [], shown: [] });

/** Saved places, with her first city as the base for more suggestions. */
export const draftFromSaved = (p: MarketPlaces): PlacesDraft => ({ ...p, base: p.cities[0] ?? null, nearby: [], shown: p.cities.map(cityId) });

/** Next nearby cities not picked and not offered yet; once all were offered, starts over. */
const nextUnseen = (d: PlacesDraft, count: number, keep: MarketCity[]): MarketCity[] => {
  const kept = new Set(keep.map(cityId));
  const fresh = d.nearby.filter((c) => !kept.has(cityId(c)) && !d.shown.includes(cityId(c)));
  const pool = fresh.length >= count ? fresh : [...fresh, ...d.nearby.filter((c) => !kept.has(cityId(c)) && !fresh.includes(c))];
  return pool.slice(0, count);
};

/** A new base city: it + the 2 closest cities + its state. */
export const draftFromBase = (base: MarketCity, nearby: MarketCity[]): PlacesDraft => {
  const start: PlacesDraft = { cities: [base], state: base.state, base, nearby, shown: [cityId(base)] };
  const more = nextUnseen(start, MAX_CITIES - 1, start.cities);
  return { ...start, cities: [base, ...more], shown: [...start.shown, ...more.map(cityId)] };
};

/** Keeps her first city, swaps the others for the next nearby ones, up to 3. */
export const suggestMore = (d: PlacesDraft): PlacesDraft => {
  const keep = d.cities.slice(0, 1);
  const more = nextUnseen(d, MAX_CITIES - keep.length, keep);
  if (more.length === 0) return d;
  return { ...d, cities: [...keep, ...more], shown: [...new Set([...d.shown, ...more.map(cityId)])] };
};

export const addCity = (d: PlacesDraft, c: MarketCity): PlacesDraft => {
  if (d.cities.length >= MAX_CITIES || d.cities.some((x) => cityId(x) === cityId(c))) return d;
  return { ...d, cities: [...d.cities, c], shown: [...new Set([...d.shown, cityId(c)])], base: d.base ?? c };
};

export const removeCity = (d: PlacesDraft, c: MarketCity): PlacesDraft => ({ ...d, cities: d.cities.filter((x) => cityId(x) !== cityId(c)) });

/** True when "Suggest more cities" has something new to show. */
export const canSuggestMore = (d: PlacesDraft): boolean => d.base !== null && (d.nearby.length === 0 || nextUnseen(d, 1, d.cities.slice(0, 1)).length > 0);

export const draftPlaces = (d: PlacesDraft): MarketPlaces => ({ cities: d.cities, state: d.state });
export const isDraftValid = (d: PlacesDraft | null): boolean => Boolean(d && (d.cities.length > 0 || d.state));
