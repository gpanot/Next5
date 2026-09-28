import { describe, expect, it } from 'vitest';
import type { CompetitorAd } from '../../../src/types/admin/metaAds';
import { groupCreatives, killWindow, scoreHistory } from '../../../src/server/metaAds/evidence';

let n = 0;
const ad = (body: string, daysRunning: number, isActive: boolean): CompetitorAd => ({
  id: String((n += 1)), pageId: 'p1', pageName: 'Fleek', isActive, startDate: '2026-09-01T00:00:00.000Z', body, title: '', cta: '',
  format: 'IMAGE', imageUrl: null, daysRunning, variants: 1, libraryUrl: '', keyword: 'page',
});

// Mirrors Fleek's real history on 2026-09-28: one message scaled to many copies, several tests stopped after about a week.
const history = [
  ad('Turn winter inventory into profit', 8, false),
  ad('Join 45,000+ resellers already sourcing on Fleek', 17, true),
  ad('Join 45,000+ resellers already sourcing on Fleek', 14, true),
  ad('Join 45,000+ resellers already sourcing on Fleek', 8, false),
  ad('Join 45,000+ resellers already sourcing on Fleek', 17, true),
  ad('Earn 10% on every new customer you refer', 8, false),
  ad('Up to £1,000 in Fleek credit', 6, false),
  ad('Biggest sale of the year: up to 50% off', 3, true),
];

describe('groupCreatives', () => {
  it('treats ads with the same text as one creative and counts the running copies', () => {
    const joined = groupCreatives(history).find((c) => c.rep.body.startsWith('Join'));
    expect(joined?.ads).toHaveLength(4);
    expect(joined?.running).toBe(3);
    expect(joined?.rep.daysRunning).toBe(17);
  });
});

describe('killWindow', () => {
  it('is the median life of fully stopped creatives, or null with fewer than 3', () => {
    expect(killWindow(groupCreatives(history))).toBe(8);
    expect(killWindow(groupCreatives(history.slice(0, 2)))).toBeNull();
  });
});

describe('scoreHistory', () => {
  const { creatives } = scoreHistory(history);
  const byStart = (text: string) => creatives.find((c) => c.body.startsWith(text))?.evidence;

  it('marks the scaled message that outlived the test window as the proven winner', () => {
    const joined = byStart('Join');
    expect(joined?.proven).toBe(true);
    expect(joined?.copies).toBe(3);
    expect(joined?.winnerScore).toBeGreaterThan(60);
  });

  it('keeps reach between 0 and 1 even when many ads share one creative', () => {
    for (const c of creatives) expect(c.evidence?.reach ?? 0).toBeGreaterThanOrEqual(0);
  });

  it('needs 60+ days to prove an ad when the kill window cannot be measured', () => {
    const young = scoreHistory([ad('Only ad here, 40 days', 40, true)]).creatives[0].evidence;
    const old = scoreHistory([ad('Only ad here, 70 days', 70, true)]).creatives[0].evidence;
    expect(young?.proven).toBe(false);
    expect(old?.proven).toBe(true);
  });

  it('caps stopped ads and does not prove a brand-new one', () => {
    expect(byStart('Turn winter')?.winnerScore).toBeLessThanOrEqual(30);
    expect(byStart('Turn winter')?.proven).toBe(false);
    expect(byStart('Biggest sale')?.proven).toBe(false);
    expect(creatives[0].evidence?.winnerScore).toBeGreaterThanOrEqual(0);
  });
});
