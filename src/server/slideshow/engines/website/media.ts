// server-only — website engine media direction (spec 5.4, 5.5, 7.5).
//
// No listing photos here: every shot comes from the described library, matched to the IDC's world.
// Story shots must come from the audience's industry (asset categories); when the library has no
// good match there, the shot is flagged for an AI image (core/generatedAssets.ts), which is then
// saved to the library for the next deck. Who plays which shot:
//   Hook        clip per archetype (talking head, reaction meme…), industry boosted
//   Pain        industry footage of the problem            ┐ industry required,
//   Old way     industry footage doing it the hard way     │ AI image when missing
//   Mechanism   industry footage of the fix working         │ or weak
//   Proof       industry footage of the happy result        ┘
//   Cost/bridge worried / losing-out clip, industry boosted
//   CTA         person pointing / talking to camera, industry boosted
// No clip appears twice in a deck. Every shot carries up to 4 swaps.
// With product photos (manual profiles), Mechanism / Proof / CTA and Result-first hooks show
// the business's own photos instead (productMedia.ts); no AI image is made for those shots.

import type { ProductPhoto } from '../../../../lib/manualProfile';
import type { ImageNeed } from '../../core/generatedAssets';
import type { LibraryAsset } from '../../core/library';
import {
  AVOID_ON_PROBLEM,
  directHooks,
  emptyShot,
  hookRule,
  libraryOption,
  libraryShot,
  searchShots,
  type LibraryRule,
  type ShotMedia,
} from '../../core/media';
import type { StoryMedia, StoryTexts } from '../../core/deckAssembly';
import type { HookArchetype, Tone } from '../../core/types';
import { planProductShots, productShot, type ProductShotKey } from './productMedia';

const STORY_RULES: Record<keyof StoryTexts, LibraryRule> = {
  pain: { slot: 'slot_problem', kinds: { background: 0.1, meme: 0.1, hook: 0.05 }, minSlot: 0.4, avoidPattern: AVOID_ON_PROBLEM, intent: 'frustrated at work, stressed, annoyed' },
  oldWay: { slot: 'slot_problem', kinds: { background: 0.12, meme: 0.05, hook: 0.05 }, minSlot: 0.3, avoidPattern: AVOID_ON_PROBLEM, intent: 'doing it the slow hard way, tired, manual work' },
  mechanism: { slot: 'slot_payoff', kinds: { background: 0.15, hook: 0.05 }, minSlot: 0.35, intent: 'relief, easy, the fix working' },
  proof: { slot: 'slot_proof', kinds: { hook: 0.1, background: 0.1 }, minSlot: 0.35, intent: 'happy satisfied customer, success, confident smile' },
  inaction: { slot: 'slot_problem', kinds: { meme: 0.1, background: 0.08, hook: 0.05 }, minSlot: 0.35, avoidPattern: AVOID_ON_PROBLEM, intent: 'worried, losing out, missed chance' },
  cta: { slot: 'slot_cta', kinds: { hook: 0.2, background: 0.02 }, minSlot: 0.4, avoidPattern: 'calls? to action', intent: 'pointing at viewer, talking to camera, inviting' },
};

const STORY_KEYS = Object.keys(STORY_RULES) as Array<keyof StoryTexts>;

/** Story shots that must show the audience's industry; an AI image covers them when the library can't. */
const INDUSTRY_SHOTS: ReadonlySet<keyof StoryTexts> = new Set(['pain', 'oldWay', 'mechanism', 'proof']);

/**
 * Below this cosine similarity (shot line ↔ asset description) a match is too loose to show:
 * text-embedding-3-small puts clearly related text around 0.45+, loosely related around 0.3.
 */
export const MIN_SHOT_SIMILARITY = 0.42;

/** Tone → target energy (0–1), same scale as the descriptors. */
export const TONE_ENERGY: Record<string, number> = {
  casual: 0.55, casual_professional: 0.5, professional: 0.4, friendly: 0.55,
  witty: 0.75, authoritative: 0.4, inspirational: 0.65, educational: 0.45,
};

/** Assets in the ranking not yet used in the deck; the first one is claimed. */
function takeDistinct(ranked: LibraryAsset[], used: Set<string>): LibraryAsset[] {
  const fresh = ranked.filter((a) => !used.has(a.assetId));
  if (fresh[0]) used.add(fresh[0].assetId);
  return fresh;
}

export type WebsiteMediaInput = {
  idc: string;
  /** Audience industries (core/audienceCategories.ts). */
  categories: string[];
  tone: Tone | string;
  story: StoryTexts;
  hooks: Array<{ archetype: HookArchetype; text: string }>;
  workspaceId?: string | null;
  /** Clip ids already used elsewhere in the deck (other audiences). Updated in place. */
  used?: Set<string>;
  /** The business's own photos, described (manual profiles). */
  products?: ProductPhoto[];
};

export type WebsiteMedia = {
  story: StoryMedia;
  hooks: ShotMedia[];
  /** Story shots the library could not cover well: generate an image, then call applyGenerated. */
  needs: ImageNeed[];
  /** Ranked library runner-ups per story shot, kept as swaps under a generated image. */
  runnerUps: Partial<Record<keyof StoryTexts, LibraryAsset[]>>;
};

/** Chooses media for one brief: story once (shared), hook per card, plus the image needs. */
export async function directWebsiteMedia(input: WebsiteMediaInput): Promise<WebsiteMedia> {
  const ctx = { targetEnergy: TONE_ENERGY[input.tone] ?? 0.5, niche: null, workspaceId: input.workspaceId };
  const cats = input.categories;
  // Boost, not require: industry assets rank first, and a generic clip still stands in if the AI
  // image fails. The industry check happens on the result (see `weak` below).
  const mode = () => 'boost' as const;
  // The IDC leads every query so matches come from their world, not generic stock.
  const ranked = await searchShots(ctx, [
    ...STORY_KEYS.map((k) => ({ rule: STORY_RULES[k], text: `${input.idc}: ${input.story[k]}`, limit: 10, categories: cats, categoryMode: mode() })),
    ...input.hooks.map((h) => ({ rule: hookRule(h.archetype), text: `${input.idc}: ${h.text}`, limit: 12, categories: cats, categoryMode: 'boost' as const })),
  ]);

  const products = await planProductShots(input.story, input.products ?? []);
  const used = input.used ?? new Set<string>();
  const story = {} as StoryMedia;
  const needs: ImageNeed[] = [];
  const runnerUps: WebsiteMedia['runnerUps'] = {};
  for (let i = 0; i < STORY_KEYS.length; i++) {
    const key = STORY_KEYS[i]!;
    const pool = (ranked[i] ?? []).filter((a) => !used.has(a.assetId));
    const photos = products.shots[key as ProductShotKey];
    if (photos) {
      console.log(`[WebsiteMedia] ${input.idc}/${key}: product photo "${photos[0]!.description}"`);
      story[key] = await productShot(photos, await Promise.all(pool.slice(0, 2).map(libraryOption)));
      continue;
    }
    const best = pool[0];
    const inIndustry = !cats.length || Boolean(best?.categories.some((c) => cats.includes(c)));
    const weak = !best || !inIndustry || (best.similarity > 0 && best.similarity < MIN_SHOT_SIMILARITY);
    if (INDUSTRY_SHOTS.has(key)) {
      console.log(`[WebsiteMedia] ${input.idc}/${key}: ${best ? `best sim ${best.similarity.toFixed(2)} (${best.categories.join(',')})` : 'no match'}${weak ? ' → AI image' : ''}`);
    }
    if (INDUSTRY_SHOTS.has(key) && weak) {
      needs.push({ key: `${input.idc}:${key}`, role: key as ImageNeed['role'], text: input.story[key] });
      runnerUps[key] = pool;
    }
    story[key] = (await libraryShot(takeDistinct(ranked[i] ?? [], used))) ?? emptyShot();
  }
  // Result-first leads with the most striking product photo; without photos, with a clip.
  const hero = products.hero ? await productShot([products.hero], []) : null;
  const hooks = await directHooks(
    input.hooks.map((h) => h.archetype),
    ranked.slice(STORY_KEYS.length),
    used,
    (swaps) => (hero ? { ...hero, alternatives: swaps } : null),
  );
  return { story, hooks, needs, runnerUps };
}

/** Puts generated images on their shots; the library matches stay as swaps. */
export async function applyGenerated(media: WebsiteMedia, idc: string, generated: Map<string, LibraryAsset>): Promise<StoryMedia> {
  const story = { ...media.story };
  for (const key of STORY_KEYS) {
    const asset = generated.get(`${idc}:${key}`);
    if (!asset) continue;
    story[key] = (await libraryShot([asset, ...(media.runnerUps[key] ?? [])])) ?? story[key];
  }
  return story;
}
