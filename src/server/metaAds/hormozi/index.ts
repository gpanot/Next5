// server-only — never import from a 'use client' file.
// Step 3 "Alex Hormozi picks": read images (vision) → grade copy twice (rubric) → combine and pick (code, from winner
// evidence) → playbook (model, constrained to the picks and to verified brand levers).

import type { BrandProfile, CompetitorAd, CompetitorResearch, HormoziResult } from '../../../types/admin/metaAds';
import type { CostMeter } from '../cost';
import { extractLevers } from './levers';
import { buildPlaybook } from './playbook';
import { gradeCopy } from './rubric';
import { buildRating, choosePicks, rank, scoringReport } from './scoring';
import { readCreatives } from './vision';

/** The brand's own running creatives worth grading (best evidence first). */
const OWN_GRADED = 5;

export const runHormozi = async (profile: BrandProfile, research: CompetitorResearch, meter: CostMeter): Promise<HormoziResult> => {
  const own = research.ownAds.filter((a) => a.isActive).slice(0, OWN_GRADED);
  const ads: CompetitorAd[] = [...research.ads, ...own];
  const [reads, levers] = await Promise.all([readCreatives(ads, meter), extractLevers(profile, meter)]);
  const printed = new Map([...reads].map(([id, r]) => [id, r.onImageText]));
  const grades = await gradeCopy(ads, printed, meter);
  const ratings = ads.flatMap((ad) => {
    const grade = grades.get(ad.id);
    return grade ? [buildRating(ad, grade, reads.get(ad.id) ?? null)] : [];
  });
  const picked = choosePicks(ads, ratings);
  if (picked.length === 0) throw new Error('No ad could be graded');
  const { picks, plays } = await buildPlaybook(picked, levers, meter);
  return { scoring: scoringReport(ratings), ratings: rank(ratings), levers, picks, plays };
};
