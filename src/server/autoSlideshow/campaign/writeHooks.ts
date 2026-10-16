// server-only — never import from a 'use client' file.
// The Hook tab's "Generate for me": writes 2-6 hook lines for the campaign (one slideshow each), from the brand, the
// campaign's content slides and the admins' Hook Knowledge (formulas and examples that work on TikTok right now), and the
// stock photo search for their hook photos (the Hook photos picker opens on it; "Choose for me" picks from it).

import type { BrandProfile } from '../../../types/admin/companyIntel';
import { MAX_GENERATED_HOOKS, MIN_GENERATED_HOOKS } from '../../../types/admin/hookKnowledge';
import { hookNumber, MAX_HOOK_CHARS, MAX_PHOTO_QUERY_CHARS, type CampaignDraft } from '../../../types/admin/slideshowCampaign';
import { prisma } from '../../../lib/db';
import { HttpError } from '../../http';
import { knowledgeForPrompt } from '../../hookKnowledge/store';
import { metaAdsJson } from '../../metaAds/llm';
import { clip } from '../../metaAds/text';
import { CAMPAIGN_KIND, draftOf } from './store';

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
{PHOTO}
Return JSON: {"hooks":[string],"photo_search":string}`;

/** How the photo search is written (shared with writeHookPhotoQuery). */
const PHOTO_RULE = `"photo_search": what to type in Unsplash to find the hook's background photo: 2 to 4 plain words
naming one concrete scene a phone camera could shoot, fitting the hook and the brand's audience ("woman cooking dinner",
"golf course sunrise", "family kitchen table"). People and places, never text, logos, brands, numbers or abstract ideas.`;

/** Hook numbers picked when no content is written yet. Left to the model, it wrote "7 …" nearly every time. */
const PICK_MIN = 3;
const PICK_MAX = 9;
/** The workspace's other campaigns whose hook numbers are skipped. */
const RECENT_CAMPAIGNS = 4;

/** The numbers the workspace's latest other campaigns open their hooks with. */
const recentNumbers = async (workspaceId: string, campaignId: string): Promise<number[]> => {
  const runs = await prisma.autoSlideshowRun.findMany({
    where: { workspaceId, kind: CAMPAIGN_KIND, id: { not: campaignId } },
    orderBy: { createdAt: 'desc' },
    take: RECENT_CAMPAIGNS * 3,
    select: { campaign: true },
  });
  const numbers = runs.map((r) => draftOf(r).hooks[0]).flatMap((h) => (h && /^\d+/.test(h) ? [hookNumber(h)] : []));
  return numbers.filter((n): n is number => n !== null).slice(0, RECENT_CAMPAIGNS);
};

/** A number in PICK_MIN-PICK_MAX the recent campaigns did not use (only the latest one's skipped when all were). */
const pickNumber = (recent: number[]): number => {
  const all = Array.from({ length: PICK_MAX - PICK_MIN + 1 }, (_, i) => PICK_MIN + i);
  const fresh = all.filter((n) => !recent.includes(n));
  const pool = fresh.length > 0 ? fresh : all.filter((n) => n !== recent[0]);
  return pool[Math.floor(Math.random() * pool.length)]!;
};

/**
 * The number every hook starts with: every slideshow shares the same content and CTA slides, so "5 ways…" on one hook
 * and "6 ways…" on another cannot both be true. With content written, it is the content slides plus the CTA (5 content
 * slides + CTA = "6 ways…", see campaignNumbering.ts). Without, the campaign's hooks so far keep theirs; else it is
 * picked here (pickNumber), and the content written later follows it.
 */
const hookCount = async (workspaceId: string, campaignId: string, draft: CampaignDraft, contentCount: number): Promise<number> => {
  if (contentCount >= 2) return contentCount + 1;
  const own = draft.hooks.map(hookNumber).find((n) => n !== null);
  return own ?? pickNumber(await recentNumbers(workspaceId, campaignId));
};

const numberRule = (n: number): string =>
  `Every hook starts with the number ${n} ("${n} ways…", "${n} mistakes…"): the slideshow has ${n - 1} content slides and a closing slide.`;

/** Why the hooks' numbers are wrong, or null when every hook starts with the required number. */
const numberProblem = (hooks: string[], want: number): string | null => {
  const numbers = hooks.map((h) => (/^\d+/.test(h) ? hookNumber(h) : null));
  if (numbers.some((n) => n !== want)) return `every hook must start with the number ${want}; you wrote ${numbers.map((n) => n ?? 'none').join(', ')}`;
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

/** A photo search, cleaned: plain words only, within the length; empty when the model gave none. */
const cleanQuery = (raw: unknown): string =>
  typeof raw === 'string' ? clip(raw.replace(/["'“”#]/g, '').replace(/\s+/g, ' ').trim().toLowerCase(), MAX_PHOTO_QUERY_CHARS) : '';

export type WrittenHooks = { hooks: string[]; photoQuery: string };

/**
 * The hook photos' stock search for hooks written by hand (no photo search was written with them). Cheap: one short
 * answer. Falls back to the brand's first product category, then the campaign name.
 */
export const writeHookPhotoQuery = async (workspaceId: string, name: string, hooks: string[]): Promise<string> => {
  const brand = await brandOf(workspaceId);
  const raw = await metaAdsJson<{ photo_search?: unknown }>(
    [
      { role: 'system', content: `You pick stock photos for TikTok slideshow hooks.\n${PHOTO_RULE}\nReturn JSON: {"photo_search":string}` },
      { role: 'user', content: [brand ? `Brand: ${brand.brandName}. Offers: ${brand.valueProp}. Audience: ${brand.audience}.` : '', `Campaign: ${name}`, `Hooks:\n${hooks.join('\n')}`].filter(Boolean).join('\n\n') },
    ],
    { maxTokens: 200, label: 'OpenAI campaign hook photo search' },
  ).catch(() => ({ photo_search: '' }));
  return cleanQuery(raw.photo_search) || cleanQuery(brand?.productCategories[0]) || cleanQuery(name);
};

/** Writes `count` (2-6) hook lines for campaign `campaignId`, and their photo search. A short answer is retried with the reason. */
export const writeCampaignHooks = async (workspaceId: string, campaignId: string, name: string, draft: CampaignDraft, count: number): Promise<WrittenHooks> => {
  if (!Number.isInteger(count) || count < MIN_GENERATED_HOOKS || count > MAX_GENERATED_HOOKS) throw new HttpError(400, 'bad_count', `Pick ${MIN_GENERATED_HOOKS} to ${MAX_GENERATED_HOOKS} hooks.`);
  const [brand, knowledge] = await Promise.all([brandOf(workspaceId), knowledgeForPrompt()]);
  const fixed = await hookCount(workspaceId, campaignId, draft, draft.cards.filter((c) => c.role === 'item' && c.title.trim()).length);
  const system = SYSTEM.replace('{COUNT}', String(count)).replace('{NUMBER}', numberRule(fixed)).replace('{PHOTO}', `- ${PHOTO_RULE}`);
  let problem = '';
  let best: string[] = [];
  let photoQuery = '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const raw = await metaAdsJson<{ hooks?: unknown; photo_search?: unknown }>(
      [
        { role: 'system', content: system },
        { role: 'user', content: brief(brand, name, draft, knowledge) + (problem ? `\n\nYour last answer was rejected: ${problem}. Fix it.` : '') },
      ],
      { maxTokens: 2_000, label: 'OpenAI campaign hooks' },
    );
    const hooks = cleanHooks(raw.hooks).slice(0, count);
    photoQuery = cleanQuery(raw.photo_search) || photoQuery;
    if (hooks.length < count) {
      problem = `${hooks.length} different hooks; write exactly ${count}`;
      continue;
    }
    best = hooks;
    problem = numberProblem(hooks, fixed) ?? '';
    if (!problem) return { hooks, photoQuery: photoQuery || (await writeHookPhotoQuery(workspaceId, name, hooks)) };
  }
  if (best.length === 0) throw new HttpError(502, 'hooks_failed', 'Could not write the hooks. Try again.');
  const hooks = forceNumber(best, fixed);
  return { hooks, photoQuery: photoQuery || (await writeHookPhotoQuery(workspaceId, name, hooks)) };
};
