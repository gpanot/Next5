// server-only — never import from a 'use client' file.
// The brand's Visual Bible (types/admin/visualBible.ts): one vision call over the site's own photos and the profile,
// stored on the brand profile of the workspace's latest Auto Slideshow run. Built on the first short, carried forward
// from an older run when a new run has none, editable in the admin. A/B tested on EQL and Porsche 2026-10-09: the
// photos got the right persona and tone; without it, the cast prompt put women in their 50s in a 22-35 brand's shorts.

import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { CostMeter } from '../metaAds/cost';
import { cleanPhotoStyle } from '../companyIntel/slideshowStyle';
import type { BrandProfile } from '../../types/admin/companyIntel';
import { VISUAL_BIBLE_FIELDS, type VisualBible, type VisualBibleKey } from '../../types/admin/visualBible';
import { creativeJson, smartModel, type UserContent } from './llm';

const MAX_IMAGES = 5;
const MAX_FIELD = 400;

/** Light words that made photos dark (Auto Slideshow A/B 2026-09-29); every Shorts photo stays bright daylight. */
export const LIGHT_WORDS = /\b(golden(?: hour)?|sunset|sunrise|dusk|dawn|night(?:time)?|evening|cinematic|moody|dark|dim(?:ly)?|noir|neon|low[- ]key|shadowy)\b\s*/gi;

const SYSTEM = `You are the art director of a brand. From its own photos and its profile, write the brand's VISUAL BIBLE:
the rules every photo of its educational short videos must follow so they look like this brand, not like stock.
Describe what the BRAND'S OWN PHOTOS show. When there are no people in them, infer the people from the audience and price level.

Return JSON with flat string keys only:
"business_category": 2-5 words,
"hero_product": 5-15 words: the ONE exact product the videos show, named with brand, model and color as seen in the photos or text (e.g. "a black Porsche 911 Carrera coupe", "an EQL matching sports bra and leggings set in slate grey"); for a service, the service moment (e.g. "a realtor showing a sunlit family home"),
"primary_subject": what most photos should center on (e.g. "the product worn by the customer in motion", "the car itself", "the agent with a client"),
"person_age_range": e.g. "25-35", or "none" when people should not appear,
"person_look": 15-30 words: build, styling, grooming, energy, as the brand's photos show its people,
"wardrobe": 10-25 words: what people wear (the brand's own product when it is clothing),
"environments": 6-8 REAL-LIFE places where this customer lives with the product, at the brand's price level, comma separated, specific. The brand's photo studio may be one of them, never most of them. No offices unless the brand is about offices,
"visual_style": 15-30 words: photographic look (editorial lifestyle, polished, minimal, documentary...) at the brand's price level. Always bright, well-exposed daylight; never cinematic, moody or dark,
"product_visibility": 10-25 words: how and how often the product appears,
"shot_vocabulary": 6-8 shot types that fit THIS category, separated by " | " (for apparel: "full-body outfit in motion | fabric detail close-up | ..."),
"consistency_rules": 15-30 words: what stays the same across all shots of one video,
"avoid": 10-25 words: looks that would be off-brand (in style, setting, price level),
"design_story": 30-50 words: the brand's visual identity in plain words.`;

/** Up to 5 content photos of the homepage (the hero first; no svg, logos, crests, icons). Empty when the page fails. */
export const siteImages = async (url: string, hero: string | null): Promise<string[]> => {
  const html = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15_000) })
    .then((r) => (r.ok ? r.text() : ''))
    .catch(() => '');
  const found = [...html.matchAll(/(?:src|data-src|srcset)="([^"]+?\.(?:jpe?g|webp|png)[^"\s]*)/gi)].map((m) => (m[1] ?? '').split(' ')[0] ?? '');
  const abs = found.map((s) => {
    try {
      return s.startsWith('//') ? `https:${s}` : new URL(s, url).href;
    } catch {
      return '';
    }
  });
  const photos = abs.filter((s) => s.startsWith('https://') && !/logo|crest|icon|favicon|sprite|badge|flag|payment|\.svg/i.test(s));
  return [...new Set([...(hero?.startsWith('https://') ? [hero] : []), ...photos])].slice(0, MAX_IMAGES);
};

/** The model's reply as a bible: every field a trimmed string, light words removed from the style and places. */
export const toVisualBible = (raw: Record<string, unknown>, images: string[], source: VisualBible['source'] = 'auto'): VisualBible | null => {
  const fields = {} as Record<VisualBibleKey, string>;
  for (const { key } of VISUAL_BIBLE_FIELDS) {
    const v = raw[key];
    fields[key] = (typeof v === 'string' ? v : Array.isArray(v) ? v.filter((x) => typeof x === 'string').join(', ') : '').trim().slice(0, MAX_FIELD);
  }
  fields.visual_style = cleanPhotoStyle(fields.visual_style) || 'Bright, clean, true-to-life lifestyle photography in daylight.';
  fields.environments = fields.environments.replace(LIGHT_WORDS, '').replace(/\s{2,}/g, ' ').trim();
  if (!fields.hero_product || !fields.person_look) return null;
  return { ...fields, source, updatedAt: new Date().toISOString(), images };
};

const profileText = (profile: BrandProfile, images: string[]) => `BRAND: ${profile.brandName} (${profile.domain})
VALUE PROP: ${profile.valueProp}
AUDIENCE: ${profile.audience}
TONE: ${profile.tone}
CATEGORIES: ${profile.productCategories.join(', ')}
PHOTO STYLE (from site text): ${profile.slideshowStyle?.photoStyle ?? 'none'}
PALETTE: ${profile.palette.join(', ')}
${images.length ? `The brand's own photos follow (${images.length}).` : 'No photos could be read: infer from the text.'}`;

/** One vision call. Retries without the photos when an image URL breaks the call. */
export const buildVisualBible = async (url: string, profile: BrandProfile, meter: CostMeter): Promise<VisualBible | null> => {
  const images = await siteImages(url, profile.heroImageUrl);
  const ask = (imgs: string[]) => {
    const user: UserContent = [{ type: 'text', text: profileText(profile, imgs) }, ...imgs.map((u) => ({ type: 'image_url' as const, image_url: { url: u, detail: 'low' as const } }))];
    return creativeJson<Record<string, unknown>>(SYSTEM, user, meter, 'Visual Bible', smartModel());
  };
  const raw = await ask(images).catch(() => (images.length ? ask([]) : null));
  return raw ? toVisualBible(raw, images) : null;
};

type ProfileRun = { id: string; url: string; profile: BrandProfile };

const latestRun = async (workspaceId: string): Promise<ProfileRun | null> => {
  const run = await prisma.autoSlideshowRun.findFirst({
    where: { workspaceId, profile: { not: { equals: null } } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, url: true, profile: true },
  });
  return run ? { id: run.id, url: run.url, profile: run.profile as unknown as BrandProfile } : null;
};

const saveOnRun = (run: ProfileRun, bible: VisualBible) =>
  prisma.autoSlideshowRun.update({ where: { id: run.id }, data: { profile: { ...run.profile, visualBible: bible } as unknown as Prisma.InputJsonValue } });

/** The bible of a recent older run of the same workspace (a new Auto Slideshow run starts without one). */
const olderBible = async (workspaceId: string, skipId: string): Promise<VisualBible | null> => {
  const runs = await prisma.autoSlideshowRun.findMany({
    where: { workspaceId, id: { not: skipId }, profile: { not: { equals: null } } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { profile: true },
  });
  return runs.map((r) => (r.profile as unknown as BrandProfile).visualBible).find(Boolean) ?? null;
};

/** The workspace's bible: stored, else carried from an older run, else built now and stored. Null when it cannot be made. */
export const ensureVisualBible = async (workspaceId: string, meter: CostMeter): Promise<VisualBible | null> => {
  const run = await latestRun(workspaceId);
  if (!run) return null;
  if (run.profile.visualBible) return run.profile.visualBible;
  const carried = await olderBible(workspaceId, run.id).catch(() => null);
  const bible = carried ?? (await buildVisualBible(run.url, run.profile, meter).catch((err) => {
    console.warn('[shorts] Visual Bible failed:', err instanceof Error ? err.message.slice(0, 200) : err);
    return null;
  }));
  if (bible) await saveOnRun(run, bible);
  return bible;
};

/** For the admin editor: the stored bible (null when none yet). */
export const getVisualBible = async (workspaceId: string): Promise<{ brandName: string; bible: VisualBible | null } | null> => {
  const run = await latestRun(workspaceId);
  return run ? { brandName: run.profile.brandName, bible: run.profile.visualBible ?? null } : null;
};

/** Saves an admin edit (only known fields; marked 'edited'). Null when the workspace has no brand profile. */
export const saveVisualBible = async (workspaceId: string, edit: Record<string, unknown>): Promise<VisualBible | null> => {
  const run = await latestRun(workspaceId);
  if (!run) return null;
  const merged = { ...(run.profile.visualBible ?? {}), ...edit };
  const bible = toVisualBible(merged, run.profile.visualBible?.images ?? [], 'edited');
  if (!bible) return null;
  await saveOnRun(run, bible);
  return bible;
};

/** Reads the site again and replaces the stored bible (admin "Rebuild from site"). */
export const rebuildVisualBible = async (workspaceId: string, meter: CostMeter): Promise<VisualBible | null> => {
  const run = await latestRun(workspaceId);
  if (!run) return null;
  const bible = await buildVisualBible(run.url, run.profile, meter);
  if (bible) await saveOnRun(run, bible);
  return bible;
};
