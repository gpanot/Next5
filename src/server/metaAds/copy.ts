// server-only — never import from a 'use client' file.
// Step 4: ad copy built from the Hormozi playbook. The code, not the model, decides what each ad is built on:
// slot i gets play i (round robin), that play's verified brand lever, and the visual style of the winning ad the play
// came from (round robin when its image was not read). The model only writes.

import {
  CRITERION_LABELS,
  type AdCopy,
  type BrandLever,
  type BrandProfile,
  type CopyPlan,
  type CreativeArchetype,
  type HormoziResult,
  type Play,
} from '../../types/admin/metaAds';
import { enforceClaims } from './claims';
import type { CostMeter } from './cost';
import { shortenOverLimit } from './copyLimits';
import { metaAdsJson } from './llm';
import { clip } from './text';

export const AD_STYLES = ['UGC selfie', 'Product hero', 'Lifestyle', 'Testimonial', 'Flat lay', 'Bold text'] as const;

/**
 * Where the hook will sit, told to the image model so the photo leaves room for it (the placement step still checks).
 * Worded as composition, not "empty space": asking for blank areas makes the model paint bands.
 */
const COMPOSITION: Record<string, string> = {
  'UGC selfie': ' Frame the face in the upper half of the image; the lower third shows hands, product or torso, never the face.',
  Testimonial: ' Frame the face in the upper half of the image; the lower third shows hands, product or torso, never the face.',
  'Bold text': '',
};
const DEFAULT_COMPOSITION = ' Keep faces and the product in the lower two thirds; the top third shows only plain background such as wall, sky or shelves.';

/** Appended to every prompt (and stored with it, so the saved prompt is exactly what was sent). Image models
 * otherwise paint real brand logos and stray text, which a paid ad cannot run with. */
const IMAGE_GUARD =
  ' No text, letters, numbers, logos or brand names anywhere in the image. Plain unbranded clothing and packaging.' +
  // "Plain screens" made the model paint blank black screens facing the camera.
  ' Any phone or laptop faces the person using it, so the camera sees its back or its side, never a blank screen.';

/** Where the prompt's added rules begin: every version of the composition and guard sentences starts with one of these. */
const RULE_MARKERS = [' Frame the face in the upper half', ' Keep faces and the product in the lower two thirds', ' No text, letters, numbers, logos'];

/** The scene description alone, without any rules appended by any version of this code. */
const scenePart = (prompt: string): string => {
  const cut = Math.min(...RULE_MARKERS.map((m) => prompt.indexOf(m)).filter((i) => i >= 0), prompt.length);
  return prompt.slice(0, cut).trim();
};

/** The prompt sent to the image model: scene, then where the text will sit, then the guard. Idempotent. */
export const withImageRules = (prompt: string, style: string): string =>
  `${scenePart(prompt).replace(/\.?\s*$/, '.')}${COMPOSITION[style] ?? DEFAULT_COMPOSITION}${IMAGE_GUARD}`;

/** The composite layout closest to the winning ad's visual format, so the image copies what the winner did. */
const STYLE_FOR: Record<CreativeArchetype, (typeof AD_STYLES)[number] | null> = {
  ugc_photo: 'UGC selfie',
  product_shot: 'Product hero',
  lifestyle: 'Lifestyle',
  price_card: 'Bold text',
  comparison: 'Bold text',
  meme: 'Bold text',
  screenshot: 'Bold text',
  testimonial_card: 'Testimonial',
  collage: 'Flat lay',
  other: null,
};

type Slot = { n: number; play: Play; lever: BrandLever; support: BrandLever[]; style: string };

/** Play i for slot i, its own lever first, plus two other verified levers the ad may also use.
 *  `offset` = ads already made for this site, so a follow-up batch starts on the next plays instead of the same ones. */
const planSlots = (count: number, hormozi: HormoziResult, offset = 0): Slot[] => {
  const leverById = new Map(hormozi.levers.map((l) => [l.id, l]));
  return Array.from({ length: count }, (_, n) => {
    const i = n + offset;
    const play = hormozi.plays[i % hormozi.plays.length];
    const lever = leverById.get(play.leverId) ?? hormozi.levers[0];
    const others = hormozi.levers.filter((l) => l.id !== lever.id);
    const support = [others[i % Math.max(others.length, 1)], others[(i + 1) % Math.max(others.length, 1)]].filter((l): l is BrandLever => Boolean(l));
    const style = (play.archetype && STYLE_FOR[play.archetype]) ?? AD_STYLES[i % AD_STYLES.length];
    return { n: n + 1, play, lever, support: [...new Set(support)], style };
  });
};

const SYSTEM = `You write Meta ads from a playbook. Each numbered SLOT tells you exactly what to build:
the play (a proven structure from a competitor ad that has run for months), the main brand lever to pull, and the visual style.

Rules:
- Fill the play's structure with the brand's facts. Keep its shape; do not copy the competitor's words.
- Claims come ONLY from the slot's levers (their site quotes prove them). No invented numbers, prices, reviews or guarantees.
- Plain words a 10-year-old reads easily. Short sentences. No hype words ("unlock", "elevate", "revolutionize", "game-changer").
- Hard limits (characters, spaces count): headline ≤ 40, primaryText ≤ 125, primaryTextAlt ≤ 125, overlayText ≤ 32. Aim ~10% under.
- primaryText and primaryTextAlt: two different takes on the slot, hook first. overlayText: burned on the image, punchy.
- imagePrompt: a vivid photo for an image model matching the style: subject, setting, light, camera, 4:5 framing.
  The scene fills the frame edge to edge; subject centered. Never ask for text, letters or logos. UGC selfie = handheld phone photo, real person.
Return JSON: {"ads": [{"slot": number, "angle": 2-4 words, "headline", "primaryText", "primaryTextAlt", "overlayText", "imagePrompt"}]}`;

const describeLever = (l: BrandLever) => `[${CRITERION_LABELS[l.criterion]}] ${l.claim} (site: "${l.quote}")`;

const describeSlot = (s: Slot) =>
  `SLOT ${s.n} — style: ${s.style}\nPlay "${s.play.name}": ${s.play.structure}\nExample: ${s.play.example}\nMain lever: ${describeLever(s.lever)}${
    s.support.length ? `\nMay also use: ${s.support.map(describeLever).join('; ')}` : ''
  }`;

/** Ads already made for this site; the writer must not repeat them. */
export type PriorAds = { offset: number; headlines: string[] };

const priorBlock = (prior?: PriorAds) =>
  prior?.headlines.length ? `\n\nALREADY MADE for this brand. Write new angles and new headlines; do not repeat or reword these:\n${prior.headlines.map((h) => `- ${h}`).join('\n')}` : '';

const userPrompt = (profile: BrandProfile, slots: Slot[], prior?: PriorAds) =>
  `BRAND: ${profile.brandName} (${profile.domain}) — ${profile.valueProp}\nBUYER: ${profile.audience}\nTONE: ${profile.tone}\n\n${slots.map(describeSlot).join('\n\n')}${priorBlock(prior)}`;

const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

type RawAd = { slot?: number; angle?: unknown; headline?: unknown; primaryText?: unknown; primaryTextAlt?: unknown; overlayText?: unknown; imagePrompt?: unknown };

/** Play, source ad and style come from the slot, never from the model's answer. */
const toAdCopy = (raw: RawAd | undefined, slot: Slot): AdCopy | null => {
  const ad = {
    angle: clip(str(raw?.angle), 40),
    style: slot.style,
    headline: str(raw?.headline),
    primaryText: str(raw?.primaryText),
    primaryTextAlt: str(raw?.primaryTextAlt),
    overlayText: str(raw?.overlayText),
    imagePrompt: clip(str(raw?.imagePrompt), 1_200),
    play: slot.play.name,
    inspiredByAdId: slot.play.fromAdId,
  };
  if (!ad.angle || !ad.headline || !ad.primaryText || !ad.overlayText || !ad.imagePrompt) return null;
  return { ...ad, imagePrompt: withImageRules(ad.imagePrompt, slot.style) };
};

export const writeCopy = async (profile: BrandProfile, hormozi: HormoziResult, count: number, meter: CostMeter, prior?: PriorAds): Promise<CopyPlan> => {
  const slots = planSlots(count, hormozi, prior?.offset);
  const raw = await metaAdsJson<{ ads?: RawAd[] }>(
    [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: userPrompt(profile, slots, prior) },
    ],
    { maxTokens: 16_000, timeoutMs: 120_000, meter, label: 'OpenAI copywriting' },
  );
  const bySlot = new Map((raw.ads ?? []).map((ad) => [ad.slot, ad]));
  const ads = slots.map((slot) => toAdCopy(bySlot.get(slot.n), slot)).filter((ad): ad is AdCopy => ad !== null);
  if (ads.length < count) throw new Error(`Copy step returned ${ads.length} valid ads, expected ${count}`);
  // Facts = the verified lever claims and their site quotes, plus the site text they came from.
  const facts = [...hormozi.levers.flatMap((l) => [l.claim, l.quote]), profile.pageExcerpt].join('\n');
  const shortened = await shortenOverLimit(await enforceClaims(ads, facts, meter), meter);
  // Shortening can drop a qualifier again, so the claim check runs last too.
  return { ads: await shortenOverLimit(await enforceClaims(shortened, facts, meter), meter) };
};
