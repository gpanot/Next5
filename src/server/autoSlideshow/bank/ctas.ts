// server-only — never import from a 'use client' file.
// Bank step 3: three CTA slides (direct offer, easy first step, result). One rewrite when any breaks a rule; a CTA that
// still breaks one is dropped, and a business left with none gets a plain one from its name.

import type { BrandProfile } from '../../../types/admin/companyIntel';
import type { BrandLever } from '../../../types/admin/metaAds';
import type { BankCta } from '../../../types/admin/slideshowBank';
import type { CostMeter } from '../../metaAds/cost';
import { metaAdsJson } from '../../metaAds/llm';
import { clip } from '../../metaAds/text';
import { ctaProblems } from './checks';
import { CTA_SYSTEM } from './prompts';

type RawCta = { angle?: unknown; title?: unknown; body?: unknown; photo?: unknown };
type Draft = Omit<BankCta, 'id'> & { problems: string[] };

const str = (v: unknown, max: number) => (typeof v === 'string' ? clip(v.replace(/\s+/g, ' ').trim(), max) : '');

const FALLBACK_PHOTO = 'A happy person seen from behind walking outdoors in bright daylight, relaxed and confident.';

export const writeCtas = async (brief: string, profile: BrandProfile, levers: BrandLever[], meter: CostMeter): Promise<BankCta[]> => {
  const site = profile.pageExcerpt ?? '';
  const draft = async (extra: string): Promise<Draft[]> => {
    const raw = await metaAdsJson<{ ctas?: RawCta[] }>(
      [{ role: 'system', content: CTA_SYSTEM }, { role: 'user', content: brief + extra }],
      { maxTokens: 2_500, meter, label: 'OpenAI bank CTAs' },
    );
    return (raw.ctas ?? []).slice(0, 3).map((c) => {
      const cta = { angle: str(c.angle, 40), title: str(c.title, 80), body: str(c.body, 120), photo: str(c.photo, 400) || FALLBACK_PHOTO };
      return { ...cta, problems: cta.title ? ctaProblems(cta, levers, site) : ['empty title'] };
    });
  };
  let ctas = await draft('');
  const failing = ctas.filter((c) => c.problems.length > 0);
  if (failing.length > 0) {
    const reasons = failing.map((c) => `"${c.title} — ${c.body}": ${c.problems.join(', ')}`).join('\n- ');
    const second = await draft(`\n\nRewrite all 3. Problems last time:\n- ${reasons}`);
    if (second.filter((c) => c.problems.length === 0).length >= ctas.filter((c) => c.problems.length === 0).length) ctas = second;
  }
  const kept = ctas.filter((c) => c.problems.length === 0);
  const final = kept.length > 0 ? kept : [{ angle: 'direct offer', title: `Try ${profile.brandName}`, body: clip(profile.valueProp, 70), photo: FALLBACK_PHOTO }];
  return final.map(({ angle, title, body, photo }, i) => ({ id: `c${i + 1}`, angle, title, body, photo }));
};
