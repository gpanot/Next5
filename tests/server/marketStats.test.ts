import { describe, expect, it } from 'vitest';
import { angleOf, areaKey, isoWeek, parseMarketArea } from '../../src/lib/marketArea';
import { freshStats, isPublishable, statsFromFlat, type MarketStat } from '../../src/server/realtor/marketStats';

const NOW = new Date('2026-11-12T12:00:00.000Z');

const stat = (over: Partial<MarketStat>): MarketStat => ({
  name: 'Median sale price', value: '$412,000', change: '+3% YoY', period: 'Oct 2026', asOf: '2026-11-01', cadence: 'monthly',
  meaning: 'Prices still rising.', sourceName: 'Redfin', sourceUrl: 'https://www.redfin.com/city/1/GA/Smyrna/housing-market', ...over,
});

describe('freshStats', () => {
  it('keeps sourced, recent stats', () => {
    const { kept } = freshStats([stat({}), stat({ name: '30-yr rate', cadence: 'weekly', asOf: '2026-11-06' })], NOW);
    expect(kept).toHaveLength(2);
  });

  it('drops stats with no source, too old, or in the future', () => {
    const { kept, rejected } = freshStats(
      [
        stat({ sourceUrl: '' }),
        stat({ name: 'Inventory', cadence: 'weekly', asOf: '2026-10-20' }),
        stat({ name: 'DOM', asOf: '2026-09-01' }),
        stat({ name: 'Future', asOf: '2026-12-01' }),
        stat({ name: 'No date', asOf: 'recent' }),
      ],
      NOW,
    );
    expect(kept).toEqual([]);
    expect(rejected.map((r) => r.why)).toEqual(['no source URL', 'too old (24 days)', 'too old (73 days)', 'dated in the future', 'no date']);
  });

  it('drops duplicates by name', () => {
    expect(freshStats([stat({}), stat({})], NOW).kept).toHaveLength(1);
  });
});

describe('isPublishable', () => {
  it('needs 3 stats and one weekly-moving stat', () => {
    expect(isPublishable([stat({}), stat({ name: 'b' }), stat({ name: 'c' })])).toBe(false);
    expect(isPublishable([stat({}), stat({ name: 'b' }), stat({ name: 'c', cadence: 'weekly' })])).toBe(true);
    expect(isPublishable([stat({ cadence: 'weekly' }), stat({ name: 'b' })])).toBe(false);
  });
});

describe('statsFromFlat', () => {
  it('reads flat keys', () => {
    const stats = statsFromFlat({ s1Name: 'Rate', s1Value: '6.2%', s1Cadence: 'weekly', s1SourceUrl: 'https://x.com/a', s2Name: '' });
    expect(stats).toHaveLength(1);
    expect(stats[0]!.cadence).toBe('weekly');
  });
});

describe('market area', () => {
  it('parses and normalizes', () => {
    const a = parseMarketArea({ city: ' Smyrna ', state: 'ga', zips: ['30080', 'bad', '30082', '30080'] });
    expect(a).toEqual({ city: 'Smyrna', state: 'GA', zips: ['30080', '30082'], neighborhoods: [] });
    expect(parseMarketArea({ city: 'X', state: 'Georgia' })).toBeNull();
  });

  it('gives one key whatever the order', () => {
    const a = parseMarketArea({ city: 'Smyrna', state: 'GA', zips: ['30082', '30080'] })!;
    const b = parseMarketArea({ city: 'smyrna', state: 'ga', zips: ['30080', '30082'] })!;
    expect(areaKey(a)).toBe(areaKey(b));
  });

  it('computes ISO weeks and rotates the angle', () => {
    expect(isoWeek(new Date('2026-11-12'))).toBe('2026-W46');
    expect(isoWeek(new Date('2027-01-01'))).toBe('2026-W53');
    expect(angleOf('2026-W46')).not.toBe(angleOf('2026-W47'));
  });
});
