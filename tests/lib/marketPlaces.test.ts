import { describe, expect, it } from 'vitest';
import { areaForBeat, beatKeysFor, parseMarketPlaces, stateCode, storedMarketArea } from '../../src/lib/marketPlaces';
import { addCity, canSuggestMore, draftFromBase, placeIds, postDates, removeCity, suggestMore } from '../../src/components/app/autopilot/placesDraft';

const austin = { city: 'Austin', state: 'TX' };
const near = ['Round Rock', 'Cedar Park', 'Pflugerville', 'Georgetown', 'San Marcos'].map((city) => ({ city, state: 'TX' }));

describe('market places', () => {
  it('reads state names and codes', () => {
    expect(stateCode('texas')).toBe('TX');
    expect(stateCode('tx')).toBe('TX');
    expect(stateCode('Narnia')).toBeNull();
  });

  it('reads an old single-city row as that city + its state', () => {
    expect(parseMarketPlaces({ city: 'Austin', state: 'TX', zips: [] })).toEqual({ cities: [austin], state: 'TX' });
  });

  it('round-trips the stored shape, keeping the legacy first-city fields', () => {
    const stored = storedMarketArea({ cities: [austin, near[0]!], state: null });
    expect(stored.city).toBe('Austin');
    expect(parseMarketPlaces(stored)).toEqual({ cities: [austin, near[0]], state: null });
  });

  it('maps each beat to its place, state last', () => {
    const p = { cities: [austin, near[0]!], state: 'TX' };
    expect(beatKeysFor(p)).toEqual(['market_update.stats', 'market_update.stats_2', 'market_update.state']);
    expect(areaForBeat(p, 'market_update.stats_2')?.city).toBe('Round Rock');
    expect(areaForBeat(p, 'market_update.state')).toEqual({ city: '', state: 'TX', zips: [], neighborhoods: [] });
    expect(areaForBeat(p, 'market_update.stats_3')).toBeNull();
  });
});

describe('places draft', () => {
  it('suggests the base + 2 closest + the state', () => {
    const d = draftFromBase(austin, near);
    expect(d.cities.map((c) => c.city)).toEqual(['Austin', 'Round Rock', 'Cedar Park']);
    expect(d.state).toBe('TX');
  });

  it('rotates the others, keeps the first city, then starts over', () => {
    let d = suggestMore(draftFromBase(austin, near));
    expect(d.cities.map((c) => c.city)).toEqual(['Austin', 'Pflugerville', 'Georgetown']);
    d = suggestMore(d);
    expect(d.cities.map((c) => c.city)).toEqual(['Austin', 'San Marcos', 'Round Rock']);
    expect(canSuggestMore(d)).toBe(true);
  });

  it('adds and removes cities, max 3, no duplicates', () => {
    let d = removeCity(draftFromBase(austin, near), near[0]!);
    expect(d.cities).toHaveLength(2);
    d = addCity(d, { city: 'Dallas', state: 'TX' });
    expect(addCity(d, { city: 'Waco', state: 'TX' }).cities).toHaveLength(3);
    expect(addCity(d, austin)).toBe(d);
  });
});

describe('post dates', () => {
  it('takes the next free days, 2 days apart, and keeps her own pick', () => {
    const d = draftFromBase(austin, near);
    const busy = new Set(['2026-11-16', '2026-11-19']);
    expect(postDates(d, busy, '2026-11-16')).toEqual(['2026-11-17', '2026-11-20', '2026-11-22', '2026-11-24']);
    const own = { ...d, dates: { [placeIds(d)[1]!]: '2026-11-18' } };
    expect(postDates(own, busy, '2026-11-16')).toEqual(['2026-11-17', '2026-11-18', '2026-11-20', '2026-11-22']);
  });
});
