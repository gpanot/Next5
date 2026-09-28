// server-only — never import from a 'use client' file.
// Step 3d: turn the picked ads (already chosen by score) into reusable plays for this brand. The model only explains
// and adapts what the verified scores show; every play must name the pick it came from and a verified brand lever.

import { ARCHETYPE_LABELS, CRITERION_LABELS, HORMOZI_CRITERIA, type AdRating, type BrandLever, type CompetitorAd, type HormoziPick, type Play } from '../../../types/admin/metaAds';
import type { Picked } from './scoring';
import type { CostMeter } from '../cost';
import { metaAdsJson } from '../llm';
import { clip } from '../text';

const MAX_PLAYS = 6;

const SYSTEM = `You are Alex Hormozi reviewing ads the market already picked: the advertiser kept paying for them past their usual
test window, or duplicated them. Do not re-rank them. A pick marked OWN is the brand's own proven ad.
For each pick, using ONLY the evidence given (money behaviour, scores, quotes, what the image shows):
- "why": one or two sentences on why it works, citing its quoted words, its image and the advertiser's behaviour.
- "stealThis": its reusable structure, copy AND image, as a template with [PLACEHOLDERS], e.g. "[Price card image] + [Audience callout] + [specific price] + [risk removed]".
- "fix": what you would change to make it stronger, aimed at its WEAKEST criteria listed.
Then write plays for the brand: each play reuses one pick's structure and is powered by one of the brand's levers.
- "structure": template with at least two [PLACEHOLDERS].
- "example": a filled-in line for the brand using ONLY that lever's claim. No invented numbers, prices or guarantees.
Return JSON: {"picks": [{"n": pick number, "why", "stealThis", "fix"}],
"plays": [{"name": 2-4 words, "fromPick": pick number, "lever": lever id, "structure", "example"}] (3-${MAX_PLAYS} plays)}`;

const describeImage = (rating: AdRating) => {
  const c = rating.creative;
  if (!c) return 'Image: not read (video or no image)';
  return `Image: ${ARCHETYPE_LABELS[c.archetype]} — ${c.subject}${c.onImageText ? ` — printed: "${clip(c.onImageText, 160)}"` : ''} — thumb-stop ${c.thumbStop.score}/3 (${c.thumbStop.because}), clarity ${c.clarity.score}/3`;
};

const describePick = (ad: CompetitorAd, rating: AdRating, n: number): string => {
  const scored = HORMOZI_CRITERIA.map((c) => `${CRITERION_LABELS[c]} ${rating.scores[c].score}/3${rating.scores[c].quote ? ` ("${rating.scores[c].quote}")` : ''}`);
  const weakest = [...HORMOZI_CRITERIA].sort((a, b) => rating.scores[a].score - rating.scores[b].score).slice(0, 3).map((c) => CRITERION_LABELS[c]);
  const money = ad.evidence?.reasons.join('; ') ?? `live ${ad.daysRunning} days`;
  return `PICK ${n}${rating.own ? ' (OWN)' : ''} — ${ad.pageName}\nMoney behaviour: ${money}\n${ad.title ? `"${ad.title}"\n` : ''}${clip(ad.body, 500)}\n${describeImage(rating)}\nCopy scores: ${scored.join('; ')}\nWeakest: ${weakest.join(', ')}`;
};

const placeholders = (text: string) => (text.match(/\[[^\]]+\]/g) ?? []).length;

const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

type RawPlaybook = {
  picks?: { n?: number; why?: unknown; stealThis?: unknown; fix?: unknown }[];
  plays?: { name?: unknown; fromPick?: number; lever?: unknown; structure?: unknown; example?: unknown }[];
};

export const buildPlaybook = async (
  picked: Picked[],
  levers: BrandLever[],
  meter: CostMeter,
): Promise<{ picks: HormoziPick[]; plays: Play[] }> => {
  const leverList = levers.map((l) => `${l.id} [${CRITERION_LABELS[l.criterion]}] ${l.claim} (site: "${l.quote}")`).join('\n');
  const raw = await metaAdsJson<RawPlaybook>(
    [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `${picked.map((p, i) => describePick(p.ad, p.rating, i + 1)).join('\n\n')}\n\nBRAND LEVERS\n${leverList}` },
    ],
    { maxTokens: 10_000, reasoningEffort: 'medium', meter, label: 'OpenAI playbook' },
  );

  const picks: HormoziPick[] = picked.map(({ ad, rating, proven }, i) => {
    const r = raw.picks?.find((p) => p.n === i + 1);
    const stealThis = str(r?.stealThis);
    return { adId: ad.id, own: rating.own, proven, why: str(r?.why), stealThis: placeholders(stealThis) >= 2 ? stealThis : '', fix: str(r?.fix) };
  });

  const leverIds = new Set(levers.map((l) => l.id));
  const plays: Play[] = (raw.plays ?? [])
    .map((p) => {
      const from = picked[(p.fromPick ?? 0) - 1];
      return { name: str(p.name), structure: str(p.structure), example: str(p.example), leverId: str(p.lever), fromAdId: from?.ad.id ?? '', archetype: from?.rating.creative?.archetype ?? null };
    })
    // A play must trace back to a real pick and a verified lever, or it is the model making things up.
    .filter((p) => p.name && p.example && p.fromAdId && leverIds.has(p.leverId) && placeholders(p.structure) >= 2)
    .slice(0, MAX_PLAYS);
  if (plays.length === 0) throw new Error('Playbook returned no play tied to a pick and a verified brand lever');
  return { picks, plays };
};
