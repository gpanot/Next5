// server-only — never import from a 'use client' file.
// The CTA slide's photo, shared by Brand Cast (the photo plan) and Hooks Volume (the campaign's "Auto"): the main person
// using or wearing the brand's product in the real situation, at the moment it pays off. Picked in the CTA photo A/B of
// 2026-10-20 (3 brands, 5 prompt strategies): "product hero in use" kept 5 of 6 by the user's eye; the literal CTA action
// (tapping "Download", a store page on a phone) 0 of 6; Gemini, Jev and GPT-6.1 Sol as judges were no better than chance.
// CTA_PHOTO_MODE=legacy brings back the old CTA photo (Hooks Volume: the cover scene; Brand Cast: "enjoying the result").

import type { BrandProfile } from '../../types/admin/companyIntel';
import type { CampaignCtaText } from '../../types/admin/slideshowCampaign';
import { prisma } from '../../lib/db';
import { brandPhotoFacts } from '../brandContent/productPhotos';
import { metaAdsJson } from '../metaAds/llm';
import { clip } from '../metaAds/text';
import { presignObject } from '../storage/objectStore';

/** False under CTA_PHOTO_MODE=legacy: the CTA photo goes back to how it was made before 2026-10-20. */
export const productCtaPhoto = (): boolean => process.env.CTA_PHOTO_MODE !== 'legacy';

/** The CTA photo rule, as the photo plan and the scene writer both state it. */
export const CTA_PHOTO_RULE = `CTA (last slide): the main person USING or WEARING the brand's product in the real situation the
  slideshow is about, at the moment it pays off, with the emotion the CTA promises (more jobs booked, food under control,
  feeling good in the outfit). Apparel: the product worn and clearly visible, nothing over it, no phone in hand. App or
  software: a phone or screen only as part of the real task, never tapping "Download" or browsing a store page. Never the
  CTA's literal verb, never a posed catalog shot, never an object-only shot. One clear subject, no clutter.`;

const SCENE_SYSTEM = `You write the background photo for the LAST slide (the call to action) of a TikTok photo slideshow.
It must feel like the same story as the slides (same world, same daylight) but it is the payoff, not another content photo.
- ${CTA_PHOTO_RULE}
- A simple, real place from the brand's world (never a studio). Bright daytime light, real-looking candid photography.
- Call the person "the main person"; never describe their face or body.
Return JSON with flat keys only: {"scene": string} — one sentence, max 40 words: shot type, action and place.`;

export type CtaSceneInput = { workspaceId: string; cta: CampaignCtaText; hooks: string[]; titles: string[] };

const brandOf = async (workspaceId: string): Promise<BrandProfile | null> => {
  const run = await prisma.autoSlideshowRun.findFirst({ where: { workspaceId, profile: { not: { equals: null } } }, orderBy: { createdAt: 'desc' }, select: { profile: true } });
  return (run?.profile as unknown as BrandProfile | null) ?? null;
};

const brief = (brand: BrandProfile | null, input: CtaSceneInput, product: string | null) => {
  const v = brand?.visualBible;
  return [
    brand && `BRAND: ${brand.brandName}. SELLS: ${brand.valueProp}\nAUDIENCE: ${brand.audience}`,
    v && `PLACES: ${v.environments}\nWARDROBE: ${v.wardrobe}`,
    `HOOK: ${input.hooks[0] ?? ''}`,
    `CONTENT SLIDES: ${input.titles.join(' / ')}`,
    `CTA SLIDE TEXT: "${input.cta.title}"${input.cta.body ? ` — ${input.cta.body}` : ''}`,
    `BRAND PRODUCT: ${product ?? brand?.valueProp ?? 'the brand\'s product'}`,
  ].filter(Boolean).join('\n');
};

/** The CTA photo's scene, written from the CTA text and the slides. Null when the call fails (the caller keeps its cover scene). */
export const writeCtaScene = async (input: CtaSceneInput): Promise<string | null> => {
  try {
    const [brand, refs] = await Promise.all([brandOf(input.workspaceId), productRef(input.workspaceId)]);
    const raw = await metaAdsJson<{ scene?: unknown }>(
      [{ role: 'system', content: SCENE_SYSTEM }, { role: 'user', content: brief(brand, input, refs?.name ?? null) }],
      { maxTokens: 2_000, label: 'OpenAI campaign CTA scene' },
    );
    const scene = typeof raw.scene === 'string' ? clip(raw.scene.replace(/\s+/g, ' ').trim(), 400) : '';
    return scene || null;
  } catch (err) {
    console.warn('[cta-photo] scene failed, cover scene kept:', err instanceof Error ? err.message.slice(0, 200) : err);
    return null;
  }
};

/** Product photo types, best first, for the CTA's product reference. */
const PRODUCT_ORDER = ['product_in_use', 'product_on_person', 'product_only', 'screen_ui'];

/** The brand photo that shows its product best, usable as a reference image; null when there is none. */
const productRef = async (workspaceId: string): Promise<{ name: string; key: string } | null> => {
  const photos = await brandPhotoFacts(workspaceId).catch(() => []);
  const rank = (t: string) => (PRODUCT_ORDER.includes(t) ? PRODUCT_ORDER.indexOf(t) : PRODUCT_ORDER.length);
  const pick = photos.filter((p) => p.usableAsReference && rank(p.photoType) < PRODUCT_ORDER.length).sort((a, b) => rank(a.photoType) - rank(b.photoType))[0];
  return pick ? { name: pick.productName || pick.description, key: pick.r2Key } : null;
};

/** The least used ready Brand Cast member (read only: a CTA photo does not count as a use). */
const castFace = async (workspaceId: string): Promise<{ look: string; key: string } | null> => {
  const rows = await prisma.$queryRaw<{ look: string; image_key: string }[]>`
    SELECT look, image_key FROM brand_cast_members
    WHERE workspace_id = ${workspaceId} AND archived_at IS NULL AND status = 'ready' AND image_key IS NOT NULL
    ORDER BY uses ASC, slot ASC LIMIT 1`;
  const row = rows[0];
  return row ? { look: row.look.replace(/\s*(Everyday style|Outfit):.*$/, ''), key: row.image_key } : null;
};

/**
 * What the CTA photo adds to its scene: the cast member's look, and the reference images with what they are (the cast
 * face first, then the product), worded as the photo plan words them. Links that cannot be signed are left out.
 */
export const ctaPhotoRefs = async (workspaceId: string): Promise<{ look: string | null; urls: string[]; notes: string[] }> => {
  const [face, product] = await Promise.all([castFace(workspaceId), productRef(workspaceId)]);
  const urls: string[] = [];
  const notes: string[] = [];
  const faceUrl = face ? await presignObject(face.key, 60 * 60).catch(() => null) : null;
  if (faceUrl?.startsWith('https://')) {
    urls.push(faceUrl);
    notes.push(`Image ${urls.length} is the main person: keep the SAME person (face, hair, skin tone, build); change the pose, place and clothes as described here.`);
  }
  const productUrl = product ? await presignObject(product.key, 60 * 60).catch(() => null) : null;
  if (product && productUrl?.startsWith('https://')) {
    urls.push(productUrl);
    notes.push(`Image ${urls.length} is the brand's product (${product.name}): show this EXACT product (same shape, colors and details); do not copy that photo's person, pose or background.`);
  }
  return { look: faceUrl ? face!.look : null, urls, notes };
};
