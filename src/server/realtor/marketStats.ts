// Pure: parsing and freshness rules for market update stats, unit tested.
// Plan: docs/business-studios/15-realtor-autopilot-plan.md §4.6.

/** weekly = moves every week (rates, inventory, new listings); monthly = reported once a month (prices, DOM). */
export type StatCadence = 'weekly' | 'monthly';

export type MarketStat = {
  name: string;
  value: string;
  change: string;
  /** What the number covers, e.g. "Oct 2026" or "week of Nov 9". */
  period: string;
  /** YYYY-MM-DD the source published or last updated it. */
  asOf: string;
  cadence: StatCadence;
  /** One plain line: what it means for buyers or sellers. */
  meaning: string;
  sourceName: string;
  sourceUrl: string;
};

export const MAX_STATS = 6;
export const MIN_STATS = 3;
/** Days a stat may be old (§4.6): weekly-moving 14, monthly-reported 45. */
export const MAX_AGE_DAYS: Record<StatCadence, number> = { weekly: 14, monthly: 45 };

const DAY = 86_400_000;
const clip = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Flat keys s1Name…s6Url (small models drop nested objects) → stats, unvalidated. */
export const statsFromFlat = (raw: Record<string, unknown>): MarketStat[] =>
  Array.from({ length: MAX_STATS }, (_, i) => {
    const k = (f: string) => raw[`s${i + 1}${f}`];
    return {
      name: clip(k('Name'), 40),
      value: clip(k('Value'), 24),
      change: clip(k('Change'), 30),
      period: clip(k('Period'), 30),
      asOf: clip(k('AsOf'), 10),
      cadence: (k('Cadence') === 'weekly' ? 'weekly' : 'monthly') as StatCadence,
      meaning: clip(k('Meaning'), 90),
      sourceName: clip(k('SourceName'), 40),
      sourceUrl: clip(k('SourceUrl'), 500),
    };
  }).filter((s) => s.name && s.value);

export type Rejected = { stat: MarketStat; why: string };

/** Keeps stats with a real http(s) source and a recent asOf (never in the future). */
export const freshStats = (stats: MarketStat[], now: Date): { kept: MarketStat[]; rejected: Rejected[] } => {
  const kept: MarketStat[] = [];
  const rejected: Rejected[] = [];
  const seen = new Set<string>();
  for (const stat of stats) {
    const at = Date.parse(`${stat.asOf}T00:00:00.000Z`);
    const age = (now.getTime() - at) / DAY;
    const why = !/^https?:\/\/[^\s/]+\.[^\s]+/.test(stat.sourceUrl)
      ? 'no source URL'
      : !stat.sourceName
        ? 'no source name'
        : Number.isNaN(at)
          ? 'no date'
          : age < -1
            ? 'dated in the future'
            : age > MAX_AGE_DAYS[stat.cadence]
              ? `too old (${Math.round(age)} days)`
              : seen.has(stat.name.toLowerCase())
                ? 'duplicate'
                : null;
    if (why) rejected.push({ stat, why });
    else {
      seen.add(stat.name.toLowerCase());
      kept.push(stat);
    }
  }
  return { kept, rejected };
};

/** A carousel needs ≥ 3 stats and at least one weekly-moving one (§4.6); else the week is skipped. */
export const isPublishable = (stats: MarketStat[]): boolean => stats.length >= MIN_STATS && stats.some((s) => s.cadence === 'weekly');

const KNOWN_SOURCES = ['Redfin', 'Realtor.com', 'Zillow', 'Freddie Mac', 'Mortgage News Daily', 'NAR'];

/** "Redfin Austin housing market page" → "Redfin"; unknown names keep their first two words. */
export const shortSource = (name: string): string =>
  KNOWN_SOURCES.find((k) => name.toLowerCase().includes(k.toLowerCase())) ?? name.split(' ').slice(0, 2).join(' ');
