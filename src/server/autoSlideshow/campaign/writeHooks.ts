// server-only — never import from a 'use client' file.
// The Hook tab's "Generate for me": writes 2-6 hook lines for the campaign (one slideshow each), from the brand, the
// campaign's content slides and the admins' Hook Knowledge (formulas and examples that work on TikTok right now).

import type { BrandProfile } from '../../../types/admin/companyIntel';
import { MAX_GENERATED_HOOKS, MIN_GENERATED_HOOKS } from '../../../types/admin/hookKnowledge';
import { hookNumber, MAX_HOOK_CHARS, type CampaignDraft } from '../../../types/admin/slideshowCampaign';
import { prisma } from '../../../lib/db';
import { HttpError } from '../../http';
import { knowledgeForPrompt } from '../../hookKnowledge/store';
import { metaAdsJson } from '../../metaAds/llm';
import { clip } from '../../metaAds/text';

const SYSTEM = `You write hook lines for TikTok photo slideshows. The hook is the text on the first slide: it decides if
people stop scrolling. Each hook opens its own slideshow; every slideshow shares the same content slides and the same
closing slide after it. So the hooks are NOT different ideas: they are near-copies of one hook, to A/B test the wording.
- Write exactly {COUNT} hooks. First pick ONE hook that promises what the content slides deliver, on the brand's topic.
  Every other hook repeats it word for word and changes only one or two words: add a power word before the noun
  ("N crazy ways to…", "N unconventional ways to…") or a short tag at the end ("… (easy)"). No two hooks may be identical.
- Follow the formulas and examples in the hook knowledge for that one hook: they are what works on TikTok now.
- {NUMBER}
- Every hook must fit the brand's audience and the content slides. Never name the brand.
- Simple words a 10-year-old can read. At most 12 words. No emoji, no hashtags, no quotes around the line.
- Sentence case. Never invent facts or numbers the slides do not back.
Return JSON: {"hooks":[string]}`;

/** Hook numbers the writer may pick when no content is written yet. */
const FREE_MIN = 5;
const FREE_MAX = 10;

/**
 * The number every hook starts with: every slideshow shares the same content and CTA slides, so "5 ways…" on one hook
 * and "7 ways…" on another cannot both be true. With content written, it is the content slides plus the CTA (5 content
 * slides + CTA = "6 ways…", see campaignNumbering.ts). Null: the writer picks one, the same for all.
 */
const fixedNumber = (contentCount: number): number | null => (contentCount >= 2 ? contentCount + 1 : null);

const numberRule = (fixed: number | null): string =>
  fixed !== null
    ? `Every hook starts with the number ${fixed} ("${fixed} ways…", "${fixed} mistakes…"): the slideshow has ${fixed - 1} content slides and a closing slide.`
    : `Every hook starts with the SAME number, between ${FREE_MIN} and ${FREE_MAX} ("7 ways…", "7 mistakes…"): the slides after the hook follow that number.`;

/** Why the hooks' numbers are wrong, or null when every hook starts with the same (required) number. */
const numberProblem = (hooks: string[], fixed: number | null): string | null => {
  const numbers = hooks.map((h) => (/^\d+/.test(h) ? hookNumber(h) : null));
  const want = fixed ?? numbers[0];
  if (want === null || want === undefined || numbers.some((n) => n !== want)) return `every hook must start with the same number${fixed !== null ? ` (${fixed})` : ''}; you wrote ${numbers.map((n) => n ?? 'none').join(', ')}`;
  return null;
};

/** Last resort after the retries: the shared number put at the start of every hook. */
const forceNumber = (hooks: string[], n: number): string[] => hooks.map((h) => (/^\d+/.test(h) ? h.replace(/^\d+/, String(n)) : `${n} ${h.charAt(0).toLowerCase()}${h.slice(1)}`));

/** The brand as the workspace's latest Auto Slideshow run read it; null when no website was read yet. */
const brandOf = async (workspaceId: string): Promise<BrandProfile | null> => {
  const run = await prisma.autoSlideshowRun.findFirst({ where: { workspaceId, profile: { not: { equals: null } } }, orderBy: { createdAt: 'desc' }, select: { profile: true } });
  return (run?.profile as unknown as BrandProfile | null) ?? null;
};

const brief = (brand: BrandProfile | null, name: string, draft: CampaignDraft, knowledge: string): string => {
  const slides = draft.cards.filter((c) => c.role === 'item' && c.title.trim()).map((c, i) => `${i + 1}. ${c.title.trim()}`);
  return [
    brand ? `Brand: ${brand.brandName}. What it offers: ${brand.valueProp}. Audience: ${brand.audience}. Products: ${brand.productCategories.join(', ')}. Tone: ${brand.tone}.` : 'Brand: unknown, write for the campaign topic.',
    `Campaign: ${name}`,
    slides.length > 0 ? `Content slides:\n${slides.join('\n')}` : 'No content slides yet: pick hooks that fit the campaign and the brand.',
    draft.hooks.length > 0 ? `Hooks already tried (write new ones):\n${draft.hooks.join('\n')}` : '',
    knowledge ? `Hook knowledge:\n${knowledge}` : '',
  ].filter(Boolean).join('\n\n');
};

/** Hook lines from the model, cleaned: no quotes or end punctuation, no duplicates, within the hook length. */
const cleanHooks = (raw: unknown): string[] => {
  const lines = Array.isArray(raw) ? raw.filter((h): h is string => typeof h === 'string') : [];
  const seen = new Set<string>();
  return lines
    .map((h) => clip(h.replace(/\s+/g, ' ').replace(/^["'“”]+|["'“”.!]+$/g, '').trim(), MAX_HOOK_CHARS))
    .filter((h) => h && !seen.has(h.toLowerCase()) && seen.add(h.toLowerCase()));
};

/** Writes `count` (2-6) hook lines for the campaign. A short answer is retried with the reason. */
export const writeCampaignHooks = async (workspaceId: string, name: string, draft: CampaignDraft, count: number): Promise<string[]> => {
  if (!Number.isInteger(count) || count < MIN_GENERATED_HOOKS || count > MAX_GENERATED_HOOKS) throw new HttpError(400, 'bad_count', `Pick ${MIN_GENERATED_HOOKS} to ${MAX_GENERATED_HOOKS} hooks.`);
  const [brand, knowledge] = await Promise.all([brandOf(workspaceId), knowledgeForPrompt()]);
  const fixed = fixedNumber(draft.cards.filter((c) => c.role === 'item' && c.title.trim()).length);
  const system = SYSTEM.replace('{COUNT}', String(count)).replace('{NUMBER}', numberRule(fixed));
  let problem = '';
  let best: string[] = [];
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const raw = await metaAdsJson<{ hooks?: unknown }>(
      [
        { role: 'system', content: system },
        { role: 'user', content: brief(brand, name, draft, knowledge) + (problem ? `\n\nYour last answer was rejected: ${problem}. Fix it.` : '') },
      ],
      { maxTokens: 2_000, label: 'OpenAI campaign hooks' },
    );
    const hooks = cleanHooks(raw.hooks).slice(0, count);
    if (hooks.length < count) {
      problem = `${hooks.length} different hooks; write exactly ${count}`;
      continue;
    }
    best = hooks;
    problem = numberProblem(hooks, fixed) ?? '';
    if (!problem) return hooks;
  }
  if (best.length === 0) throw new HttpError(502, 'hooks_failed', 'Could not write the hooks. Try again.');
  return forceNumber(best, fixed ?? hookNumber(best[0]!) ?? 7);
};
