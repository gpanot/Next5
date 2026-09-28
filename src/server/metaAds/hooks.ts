// server-only — never import from a 'use client' file.
// Testable hooks for one image ad. The hooks are proven templates (src/config/metaAdsHooks.ts); the model only fills
// their [slots] with the brand's words. Code rejects any fill that changed the template's own words, runs past the
// overlay limit, or states a number the brand cannot prove.

import type { MetaAd } from '@prisma/client';
import { HOOK_TEMPLATES, HOOKS_PER_AD, type HookTemplate } from '../../config/metaAdsHooks';
import type { AdHook, BrandProfile, HookFormat, MetaAdRunDto } from '../../types/admin/metaAds';
import { unsupportedNumbers } from './claims';
import { COPY_LIMITS } from './copyLimits';
import type { CostMeter } from './cost';
import { metaAdsJson } from './llm';
import { clip } from './text';

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** "Stop [doing X]" → /^stop (.+?)[.!?]*$/i: the fixed words must stay, each slot must be filled. */
const templatePattern = (template: string): RegExp => {
  const body = template
    .replace(/[.!?:]+$/, '')
    .split(/\[[^\]]+\]/)
    .map(escape)
    .join('(.+?)');
  return new RegExp(`^${body}[.!?]*$`, 'i');
};

/** True when `text` is the template with every slot filled and nothing else changed. Pure, unit-tested. */
export const fillsTemplate = (template: string, text: string): boolean => {
  const match = text.trim().match(templatePattern(template));
  return Boolean(match) && match!.slice(1).every((slot) => slot.trim().length > 0 && !/[[\]]/.test(slot));
};

/** Why a fill is rejected, or null when it can ship. Pure, unit-tested. */
export const hookProblem = (template: string, text: string, facts: string): string | null => {
  if (!fillsTemplate(template, text)) return 'changed the template';
  // A list hook promises a quick read: "3 ways to…", never a fact reused as a count ("12 ways to…").
  if (template.startsWith('[X] ') && !/^[2-9] /.test(text.trim())) return 'list count must be 2-9';
  if (text.length > COPY_LIMITS.overlayText) return `over ${COPY_LIMITS.overlayText} characters`;
  if (unsupportedNumbers(text, facts).length) return 'number the brand cannot prove';
  return null;
};

/** One hook per format first (variety to test), then the next best until `count`. Pure, unit-tested. */
export const pickHooks = (valid: AdHook[], count: number): AdHook[] => {
  const seen = new Set<HookFormat | 'original'>();
  const firsts = valid.filter((h) => !seen.has(h.format) && seen.add(h.format));
  const rest = valid.filter((h) => !firsts.includes(h));
  const chosen = new Set([...firsts, ...rest].slice(0, count));
  return valid.filter((h) => chosen.has(h));
};

const SYSTEM = `You fill proven ad hook templates for one brand. For each template, replace every [slot] with a few plain words
for this brand and buyer. Keep every other word, in order, exactly as written. The whole hook must be at most ${COPY_LIMITS.overlayText} characters.
Numbers: only small counts (2-9) or numbers written in BRAND FACTS. No invented results, prices or guarantees.
Return JSON {"<template id>": "<filled hook>"}.`;

const userPrompt = (profile: BrandProfile, ad: MetaAd, facts: string, templates: HookTemplate[]) => `BRAND: ${profile.brandName} — ${profile.valueProp}
BUYER: ${profile.audience}
THIS AD: angle "${ad.angle}" · current hook "${ad.overlayText}" · headline "${ad.headline}" · text "${ad.primaryText}"
BRAND FACTS:
${clip(facts, 3_000)}
TEMPLATES:
${templates.map((t) => `${t.id}: ${t.template}`).join('\n')}`;

/** Fills every template once, keeps the fills that pass, then picks a varied set. `original` (the ad's first hook) stays first. */
export const writeHooks = async (ad: MetaAd, original: string, run: MetaAdRunDto, profile: BrandProfile, meter: CostMeter): Promise<AdHook[]> => {
  const facts = [...(run.hormozi?.levers ?? []).flatMap((l) => [l.claim, l.quote]), profile.pageExcerpt].join('\n');
  const raw = await metaAdsJson<Record<string, unknown>>(
    [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: userPrompt(profile, ad, facts, HOOK_TEMPLATES) },
    ],
    { maxTokens: 4_000, meter, label: 'OpenAI hooks' },
  );
  const valid = HOOK_TEMPLATES.flatMap((t): AdHook[] => {
    const text = typeof raw[t.id] === 'string' ? (raw[t.id] as string).trim() : '';
    return text && !hookProblem(t.template, text, facts) ? [{ id: t.id, format: t.format, template: t.template, text }] : [];
  });
  if (valid.length === 0) throw new Error('No hook passed the checks — try again');
  const first: AdHook = { id: 'original', format: 'original', template: '', text: original };
  return [first, ...pickHooks(valid.filter((h) => h.text.toLowerCase() !== original.toLowerCase()), HOOKS_PER_AD)];
};
