// Winner evidence: what an advertiser's own spending says about each creative. Pure functions, no I/O.
// An advertiser tests many ads and stops the losers; the ones they keep running past their usual test window, and
// duplicate, are the ones that pay. We read that from their full ad history (running + stopped ads).

import { WINNER_RULES, WINNER_WEIGHTS } from '../../config/metaAdsScoring';
import type { CompetitorAd, WinnerEvidence } from '../../types/admin/metaAds';

/** One creative = same advertiser, same text. Advertisers run the same creative as many ads to scale it. */
export type Creative = { key: string; ads: CompetitorAd[]; rep: CompetitorAd; running: number; lifeDays: number; firstIndex: number };

const textKey = (ad: CompetitorAd) => `${ad.pageId || ad.pageName}|${`${ad.title} ${ad.body}`.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 140)}`;

/** Groups ads (given in the advertiser's impression order) into creatives. The representative is the oldest running copy. */
export const groupCreatives = (ads: CompetitorAd[]): Creative[] => {
  // firstIndex = the creative's rank among creatives (not among raw ads), so reach stays within 0..1.
  const groups = new Map<string, { ads: CompetitorAd[]; firstIndex: number }>();
  ads.forEach((ad, i) => {
    const key = textKey(ad);
    const group = groups.get(key) ?? { ads: [], firstIndex: i };
    group.ads.push(ad);
    groups.set(key, group);
  });
  return [...groups.entries()].map(([key, { ads: copies }], firstIndex) => {
    const running = copies.filter((a) => a.isActive);
    const pool = running.length ? running : copies;
    const rep = pool.reduce((best, a) => (a.daysRunning > best.daysRunning ? a : best), pool[0]);
    return { key, ads: copies, rep, running: running.length, lifeDays: Math.max(...copies.map((a) => a.daysRunning)), firstIndex };
  });
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** Median life of the creatives an advertiser fully stopped. Null when too few to trust. */
export const killWindow = (creatives: Creative[]): number | null => {
  const stopped = creatives.filter((c) => c.running === 0).map((c) => c.lifeDays);
  return stopped.length >= WINNER_RULES.minStoppedForBaseline ? Math.round(median(stopped)) : null;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Scores one creative against its advertiser's history. `total` = creatives in that history (for reach rank; null = unknown). */
export const winnerEvidence = (c: Creative, killMedianDays: number | null, total: number | null): WinnerEvidence => {
  const r = WINNER_RULES;
  const ageDays = c.rep.daysRunning;
  const killDays = killMedianDays ?? r.defaultKillDays;
  const copies = Math.max(c.running, c.rep.variants ?? 1, 1);
  const survival = ageDays / (2 * killDays);
  const reach = total && total > 1 ? 1 - c.firstIndex / (total - 1) : null;
  const parts = {
    survival: clamp01(survival) * WINNER_WEIGHTS.survival,
    scale: clamp01((copies - 1) / (r.scaleCapCopies - 1)) * WINNER_WEIGHTS.scale,
    age: clamp01(ageDays / r.ageCapDays) * WINNER_WEIGHTS.age,
    // Unknown reach gets half credit rather than zero, so keyword-only ads are not punished for missing data.
    reach: (reach ?? 0.5) * WINNER_WEIGHTS.reach,
  };
  const running = c.running > 0;
  const raw = Math.round(parts.survival + parts.scale + parts.age + parts.reach);
  const winnerScore = running ? raw : Math.min(raw, r.stoppedCap);
  const outlived = killMedianDays === null ? ageDays >= r.provenMinDaysNoBaseline : survival >= 1;
  const proven = running && ageDays >= r.provenMinDays && (outlived || copies >= r.provenMinCopies);

  const reasons: string[] = [];
  if (!running) reasons.push(`Stopped after ${ageDays} days`);
  else reasons.push(`Live ${ageDays} days`);
  if (killMedianDays !== null && running) reasons.push(survival >= 1 ? `Outlived their usual ${killMedianDays}-day test ${(ageDays / killMedianDays).toFixed(1)}×` : `Not yet 2× past their usual ${killMedianDays}-day test`);
  if (killMedianDays === null) reasons.push(`No kill window measurable (under ${r.minStoppedForBaseline} stopped ads)${running && ageDays >= r.provenMinDaysNoBaseline ? `, but live ${r.provenMinDaysNoBaseline}+ days` : ''}`);
  if (copies > 1) reasons.push(`Scaled: ${copies} copies running`);
  if (reach !== null && reach >= 0.8) reasons.push('Among their highest-reach ads');
  return { winnerScore, proven, ageDays, copies, killMedianDays, survival: Math.round(survival * 100) / 100, reach: reach === null ? null : Math.round(reach * 100) / 100, reasons };
};

/**
 * Evidence for every creative in one advertiser's history. `byReach` is their impression-ordered list (it sets the
 * reach rank); `recentOnly` adds ads only the most-recent read found — mostly stopped tests, which the kill window
 * needs. Returns representatives with evidence attached.
 */
export const scoreHistory = (
  byReach: CompetitorAd[],
  recentOnly: CompetitorAd[] = [],
): { creatives: CompetitorAd[]; killMedianDays: number | null; active: number; stopped: number } => {
  const creatives = groupCreatives([...byReach, ...recentOnly]);
  const reachCount = groupCreatives(byReach).length;
  const killMedianDays = killWindow(creatives);
  // Creatives first seen in the reach list come first (grouping keeps order), so their index is their reach rank.
  const scored = creatives.map((c) => ({ ...c.rep, evidence: winnerEvidence(c, killMedianDays, c.firstIndex < reachCount ? reachCount : null) }));
  return { creatives: scored, killMedianDays, active: creatives.filter((c) => c.running > 0).length, stopped: creatives.filter((c) => c.running === 0).length };
};
