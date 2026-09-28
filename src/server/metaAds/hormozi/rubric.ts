// server-only — never import from a 'use client' file.
// Step 3b: grade each ad's copy on Hormozi's criteria. The model scores against fixed anchors and must quote the ad
// for every point; the code drops any score whose quote is not in the ad, grades twice, and keeps only stable scores.

import { MAX_GRADE_SPREAD } from '../../../config/metaAdsScoring';
import { HORMOZI_CRITERIA, type CompetitorAd, type CriterionScore, type HormoziCriterion } from '../../../types/admin/metaAds';
import type { CostMeter } from '../cost';
import { metaAdsJson } from '../llm';
import { isVerbatim } from './verify';

const BATCH_SIZE = 5;
const MAX_SCORE = 3;

/** Scoring anchors. Concrete 0-3 definitions keep the model from grading on vibes. */
const ANCHORS: Record<HormoziCriterion, string> = {
  dreamOutcome: 'Names the end result the buyer wants (not a feature). 0 none · 1 vague benefit ("better stock") · 2 clear outcome ("sell out every drop") · 3 vivid, specific outcome with money or status.',
  likelihood: 'Makes the buyer believe it will work for them. 0 none · 1 generic ("quality") · 2 specific trust signal ("verified suppliers", "buyer protection") · 3 specific and quantified, or a guarantee.',
  timeDelay: 'How fast the result arrives. 0 not mentioned · 1 implied ("quick") · 2 explicit ("ships in 48h") · 3 immediate and specific.',
  effort: 'Removes work or sacrifice (done for you, no hunting, shipping included). 0 none · 1 implied · 2 one explicit removal · 3 several explicit removals.',
  callout: 'The opening names who it is for or their situation. 0 none · 1 generic audience · 2 clear audience ("Resellers:") · 3 audience and their pain in the first line.',
  proof: 'Specific numbers, results, named customers or testimonials. 0 none · 1 claims without numbers · 2 one concrete number or result · 3 several concrete numbers or a named result.',
  offer: 'A specific deal: price, discount, bonus, scarcity, urgency or guarantee. 0 none · 1 vague ("great deals") · 2 specific ("70% off", "$3 each") · 3 specific plus urgency, scarcity or a stacked bonus.',
  cta: 'Tells exactly what to do next. 0 none · 1 generic ("Learn more") · 2 specific action · 3 specific action plus a reason to act now.',
};

const SYSTEM = `You grade Meta ads the way Alex Hormozi would, using his value equation and his hook/proof/offer rules.
Grade each ad on each criterion with an integer 0-3, using ONLY these anchors:
${HORMOZI_CRITERIA.map((c) => `- ${c}: ${ANCHORS[c]}`).join('\n')}

Hard rules:
- Every score above 0 needs "quote": the exact words from the ad (copy-paste, 3-20 words) that earn it. No quote, score 0.
- Grade what the ad SAYS, not what the product might do. Be strict: most ads earn 0-1 on most criteria.
Return JSON: {"ratings": [{"n": ad number, "scores": {"<criterion>": {"score": 0-3, "quote": string|null}}}]}`;

type RawScores = Partial<Record<HormoziCriterion, { score?: unknown; quote?: unknown }>>;

/** What the grader reads: headline, body, button, and the words printed on the image when a vision read found them. */
export const adText = (ad: CompetitorAd, onImageText = '') =>
  [ad.title, ad.body, ad.cta, onImageText ? `[On the image] ${onImageText}` : ''].filter(Boolean).join('\n');

const listAds = (ads: CompetitorAd[], printed: Map<string, string>) => ads.map((ad, i) => `AD ${i + 1}\n${adText(ad, printed.get(ad.id))}`).join('\n\n');

/** Keeps a score only when its quote is really in the ad (copy or printed image text). */
const verifyScores = (raw: RawScores | undefined, text: string): { scores: Record<HormoziCriterion, CriterionScore>; rejected: number } => {
  let rejected = 0;
  const scores = Object.fromEntries(
    HORMOZI_CRITERIA.map((c) => {
      const score = Math.max(0, Math.min(MAX_SCORE, Math.round(Number(raw?.[c]?.score) || 0)));
      const quote = raw?.[c]?.quote;
      if (score === 0) return [c, { score: 0, quote: null }];
      if (!isVerbatim(quote, text)) {
        rejected += 1;
        return [c, { score: 0, quote: null }];
      }
      return [c, { score, quote: quote.replace(/^\[On the image\]\s*/, '').trim() }];
    }),
  ) as Record<HormoziCriterion, CriterionScore>;
  return { scores, rejected };
};

export type CopyGrade = { scores: Record<HormoziCriterion, CriterionScore>; unstable: HormoziCriterion[]; rejectedQuotes: number; copyScore: number };

/** Two verified gradings → one. Far apart (> MAX_GRADE_SPREAD) → the lower score, flagged unstable. */
export const mergeGrades = (a: Record<HormoziCriterion, CriterionScore>, b: Record<HormoziCriterion, CriterionScore>) => {
  const unstable: HormoziCriterion[] = [];
  const scores = Object.fromEntries(
    HORMOZI_CRITERIA.map((c) => {
      const [lo, hi] = a[c].score <= b[c].score ? [a[c], b[c]] : [b[c], a[c]];
      if (hi.score - lo.score > MAX_GRADE_SPREAD) {
        unstable.push(c);
        return [c, lo];
      }
      const score = Math.floor((lo.score + hi.score) / 2);
      return [c, { score, quote: score === 0 ? null : lo.quote ?? hi.quote }];
    }),
  ) as Record<HormoziCriterion, CriterionScore>;
  return { scores, unstable };
};

const copyScoreOf = (scores: Record<HormoziCriterion, CriterionScore>) =>
  Math.round((HORMOZI_CRITERIA.reduce((sum, c) => sum + scores[c].score, 0) / (HORMOZI_CRITERIA.length * MAX_SCORE)) * 100);

const gradeBatch = async (ads: CompetitorAd[], printed: Map<string, string>, meter: CostMeter) => {
  const raw = await metaAdsJson<{ ratings?: { n?: number; scores?: RawScores }[] }>(
    [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: listAds(ads, printed) },
    ],
    { maxTokens: 12_000, reasoningEffort: 'medium', meter, label: 'OpenAI rubric grading' },
  );
  const byN = new Map((raw.ratings ?? []).map((r) => [r.n, r.scores]));
  return ads.map((ad, i) => verifyScores(byN.get(i + 1), adText(ad, printed.get(ad.id))));
};

/**
 * Grades every ad twice (5 per call, all in parallel) and merges the two gradings. A failed batch fails the step:
 * a partial ranking would mislead. `printed` = words on each image, from the vision read.
 */
export const gradeCopy = async (ads: CompetitorAd[], printed: Map<string, string>, meter: CostMeter): Promise<Map<string, CopyGrade>> => {
  const batches: CompetitorAd[][] = [];
  for (let i = 0; i < ads.length; i += BATCH_SIZE) batches.push(ads.slice(i, i + BATCH_SIZE));
  const [first, second] = await Promise.all([0, 1].map(async () => (await Promise.all(batches.map((b) => gradeBatch(b, printed, meter)))).flat()));
  return new Map(
    ads.map((ad, i) => {
      const { scores, unstable } = mergeGrades(first[i].scores, second[i].scores);
      return [ad.id, { scores, unstable, rejectedQuotes: first[i].rejected + second[i].rejected, copyScore: copyScoreOf(scores) }];
    }),
  );
};
