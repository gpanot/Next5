// Step 3c: combine and pick. Pure functions, no I/O — the whole decision is readable and unit-tested.
// The market picks (winner score, from advertiser behaviour); craft (copy rubric + image read) only breaks ties and
// explains. Weights live in src/config/metaAdsScoring.ts.

import { CRAFT_WEIGHTS, SCORING_VERSION } from '../../../config/metaAdsScoring';
import type { AdRating, CompetitorAd, CreativeRead, ScoringReport } from '../../../types/admin/metaAds';
import type { CopyGrade } from './rubric';

const MAX_COMPETITOR_PICKS = 3;

export const craftScore = (copyScore: number, creative: CreativeRead | null): number =>
  creative ? Math.round((copyScore * CRAFT_WEIGHTS.copy + creative.visualScore * CRAFT_WEIGHTS.visual) / (CRAFT_WEIGHTS.copy + CRAFT_WEIGHTS.visual)) : copyScore;

export const buildRating = (ad: CompetitorAd, grade: CopyGrade, creative: CreativeRead | null): AdRating => ({
  adId: ad.id,
  own: ad.own === true,
  scores: grade.scores,
  unstable: grade.unstable,
  rejectedQuotes: grade.rejectedQuotes,
  copyScore: grade.copyScore,
  creative,
  craftScore: craftScore(grade.copyScore, creative),
  winnerScore: ad.evidence?.winnerScore ?? 0,
  proven: ad.evidence?.proven === true,
});

/** Proven winners first, then winner score, then craft. */
export const rank = (ratings: AdRating[]): AdRating[] =>
  [...ratings].sort((a, b) => Number(b.proven) - Number(a.proven) || b.winnerScore - a.winnerScore || b.craftScore - a.craftScore);

export type Picked = { ad: CompetitorAd; rating: AdRating; proven: boolean };

/**
 * Up to 3 competitor picks, one per advertiser, proven winners first. When nothing in the study is proven, the best
 * available ads are still picked but marked unproven. The brand's own best proven ad joins as an extra pick: what
 * already works for this buyer is the strongest evidence there is.
 */
export const choosePicks = (ads: CompetitorAd[], ratings: AdRating[]): Picked[] => {
  const byId = new Map(ads.map((ad) => [ad.id, ad]));
  const ranked = rank(ratings);
  const picks: Picked[] = [];
  const advertisers = new Set<string>();
  const anyProven = ranked.some((r) => r.proven && !r.own);
  for (const rating of ranked) {
    const ad = byId.get(rating.adId);
    if (!ad || rating.own || advertisers.has(ad.pageId || ad.pageName)) continue;
    if (anyProven && !rating.proven) break;
    picks.push({ ad, rating, proven: rating.proven });
    advertisers.add(ad.pageId || ad.pageName);
    if (picks.length === MAX_COMPETITOR_PICKS) break;
  }
  const ownBest = ranked.find((r) => r.own && r.proven);
  const ownAd = ownBest && byId.get(ownBest.adId);
  if (ownBest && ownAd) picks.push({ ad: ownAd, rating: ownBest, proven: true });
  return picks;
};

const ranks = (values: number[]) => {
  const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const out = new Array<number>(values.length);
  for (let i = 0; i < order.length; ) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j += 1;
    for (let k = i; k <= j; k += 1) out[order[k][1]] = (i + j) / 2;
    i = j + 1;
  }
  return out;
};

/** Spearman rank correlation. Null below 5 pairs or with no variance: too little to say anything. */
export const spearman = (xs: number[], ys: number[]): number | null => {
  if (xs.length < 5 || xs.length !== ys.length) return null;
  const rx = ranks(xs);
  const ry = ranks(ys);
  const mean = (rx.length - 1) / 2;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < rx.length; i += 1) {
    num += (rx[i] - mean) * (ry[i] - mean);
    dx += (rx[i] - mean) ** 2;
    dy += (ry[i] - mean) ** 2;
  }
  return dx && dy ? Math.round((num / Math.sqrt(dx * dy)) * 100) / 100 : null;
};

/** Does the rubric agree with the market on this run's competitor ads? Stored per run for later calibration. */
export const scoringReport = (ratings: AdRating[]): ScoringReport => {
  const competitors = ratings.filter((r) => !r.own);
  return {
    version: SCORING_VERSION,
    agreement: { rho: spearman(competitors.map((r) => r.craftScore), competitors.map((r) => r.winnerScore)), n: competitors.length },
    provenCount: competitors.filter((r) => r.proven).length,
  };
};
