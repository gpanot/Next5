// server-only — never import from a 'use client' file.
// Weekly market stats for a realtor's area: gpt-5.4-mini + web search, every stat sourced and dated, cached per area per
// ISO week and shared across workspaces (docs/business-studios/15-realtor-autopilot-plan.md §4.6).

import { prisma } from '../../lib/db';
import { angleOf, areaKey, areaLabel, isoWeek, type MarketArea } from '../../lib/marketArea';
import { jsonObjectIn, sourceIsLive, webSearchText } from '../ai/openaiWebSearch';
import { FAIR_HOUSING_RULES, fairHousingHits } from '../compliance/fairHousing';
import { freshStats, isPublishable, MAX_STATS, statsFromFlat, type MarketStat } from './marketStats';

const RETRY_THIN_MS = 6 * 3600_000;

export type MarketSnapshotResult = { period: string; stats: MarketStat[]; publishable: boolean; cached: boolean };

const keys = Array.from({ length: MAX_STATS }, (_, i) =>
  ['Name', 'Value', 'Change', 'Period', 'AsOf', 'Cadence', 'Meaning', 'SourceName', 'SourceUrl'].map((f) => `"s${i + 1}${f}":""`).join(','),
).join(',');

const prompt = (area: MarketArea, now: Date, period: string): string => {
  const where = [areaLabel(area), area.zips.length ? `zips ${area.zips.join(', ')}` : '', area.neighborhoods.length ? `neighborhoods ${area.neighborhoods.join(', ')}` : '']
    .filter(Boolean)
    .join('; ');
  return [
    `Today is ${now.toISOString().slice(0, 10)}. Find the latest housing market numbers for ${where}. Use web search; never guess a number.`,
    `Prefer, in order: Redfin Data Center or Redfin city "housing market" page, Realtor.com research, Zillow research, the local MLS or Realtor association monthly report, Freddie Mac PMMS (30-year mortgage rate only).`,
    `Find up to ${MAX_STATS} of: median sale price (and change), median days on market, homes for sale / active inventory (and change), new listings, sale-to-list ratio, % of homes sold over asking, 30-year fixed mortgage rate.`,
    `Include at least 2 weekly-moving numbers (mortgage rate, inventory or new listings, Cadence "weekly"). Monthly-reported numbers are Cadence "monthly".`,
    `AsOf = the YYYY-MM-DD the source published or last updated that number. Period = what it covers ("Oct 2026", "week of Nov 9"). SourceUrl = the exact page the number is on.`,
    `Meaning = one plain line, max 12 words, what it means for ${angleOf(period)} this week. 3rd-grade English. ${FAIR_HOUSING_RULES}`,
    `Return only JSON with flat keys, empty strings for stats you could not source: {${keys}}`,
  ].join('\n');
};

/** Sourced, fresh, live-linked, Fair Housing clean stats. */
const research = async (area: MarketArea, now: Date, period: string): Promise<{ stats: MarketStat[]; usdMicros: number }> => {
  const reply = await webSearchText(prompt(area, now, period), { tag: 'market-update', effort: 'low' });
  const raw = reply ? jsonObjectIn(reply.text) : null;
  if (!raw) return { stats: [], usdMicros: reply?.usdMicros ?? 0 };
  const { kept, rejected } = freshStats(statsFromFlat(raw), now);
  if (rejected.length) console.info(`[market-update] ${areaLabel(area)} dropped:`, rejected.map((r) => `${r.stat.name} (${r.why})`).join('; '));
  const clean = kept.filter((s) => fairHousingHits(`${s.name} ${s.meaning}`).length === 0);
  const live = await Promise.all(clean.map((s) => sourceIsLive(s.sourceUrl)));
  return { stats: clean.filter((_, i) => live[i]), usdMicros: reply?.usdMicros ?? 0 };
};

/** This week's stats for the area: from the shared cache, or one research call that fills it. */
export const getMarketSnapshot = async (area: MarketArea, now = new Date()): Promise<MarketSnapshotResult> => {
  const period = isoWeek(now);
  const key = areaKey(area);
  const cached = await prisma.marketSnapshot.findUnique({ where: { areaKey_kind_period: { areaKey: key, kind: 'market', period } } });
  if (cached) {
    const stats = cached.items as MarketStat[];
    // A thin week is retried after a few hours (sources update during the week); a good one is kept all week.
    if (isPublishable(stats) || now.getTime() - cached.createdAt.getTime() < RETRY_THIN_MS) {
      return { period, stats, publishable: isPublishable(stats), cached: true };
    }
  }
  const { stats, usdMicros } = await research(area, now, period);
  await prisma.marketSnapshot.upsert({
    where: { areaKey_kind_period: { areaKey: key, kind: 'market', period } },
    create: { areaKey: key, kind: 'market', period, items: stats, costUsdMicros: usdMicros },
    update: { items: stats, costUsdMicros: usdMicros, createdAt: now },
  });
  return { period, stats, publishable: isPublishable(stats), cached: false };
};
