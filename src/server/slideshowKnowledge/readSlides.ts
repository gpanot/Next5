// server-only — never import from a 'use client' file.
// Save every slide to the object store (TikTok image links expire within days), then read all slides in one vision
// call: the text on each slide, split into title and body, its role in the slideshow, and how it looks.

import sharp from 'sharp';
import { SLIDE_ROLES, type ReferenceSlide, type SlideRole } from '../../types/admin/slideshowKnowledge';
import type { CostMeter } from '../metaAds/cost';
import { metaAdsJson } from '../metaAds/llm';
import { clip } from '../metaAds/text';
import { putObject } from '../storage/objectStore';
import type { PhotoPost } from './tiktokPosts';

/** A carousel holds up to 35 photos; reading more than 20 adds cost and no insight. */
const MAX_SLIDES = 20;
const VISION_EDGE = 768;

export const slideKey = (postId: string, index: number): string => `admin/slideshow-knowledge/${postId}/${index}.jpg`;

type SavedSlide = { index: number; imageKey: string; width: number; height: number; dataUrl: string };

/** Downloads one slide, stores a 1080-wide JPEG, and returns a small copy for the vision model. */
const saveSlide = async (postId: string, index: number, url: string): Promise<SavedSlide> => {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`slide ${index + 1} download failed (${res.status})`);
  const source = sharp(Buffer.from(await res.arrayBuffer()));
  const full = await source.clone().resize(1080, undefined, { withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer({ resolveWithObject: true });
  const small = await source.clone().resize(VISION_EDGE, VISION_EDGE, { fit: 'inside' }).jpeg({ quality: 80 }).toBuffer();
  const imageKey = slideKey(postId, index);
  await putObject(imageKey, full.data, 'image/jpeg');
  return { index, imageKey, width: full.info.width, height: full.info.height, dataUrl: `data:image/jpeg;base64,${small.toString('base64')}` };
};

export const saveSlides = (post: PhotoPost): Promise<SavedSlide[]> =>
  Promise.all(post.images.slice(0, MAX_SLIDES).map((img, i) => saveSlide(post.postId, i, img.url)));

const SYSTEM = `You read the slides of one TikTok photo slideshow, in order. Report what is on each slide. Facts, not opinions.
For each slide:
- role: "hook" (first slide, the promise), "item" (one tip, secret, step, myth or point of the meat), "cta" (asks to download, follow, buy, visit, save), or "other"
- title: the headline, exactly as written: the boxed or biggest text ("" if none)
- body: the smaller text under or around the headline, exactly as written ("" if none)
- textStyle: how the text is drawn, max 10 words (e.g. "white box, black bold text, top third")
- photo: what the photo shows and its look, max 12 words (e.g. "vintage golfer mid-swing, film grain")
Keep the original spelling and capitals. Do not invent text you cannot read.
Return JSON: {"slides": [{"role","title","body","textStyle","photo"}]} with exactly one entry per slide, in order.`;

type RawSlide = Partial<Record<'role' | 'title' | 'body' | 'textStyle' | 'photo', unknown>>;

/** Line breaks on a slide are layout, not meaning: one line of text, single spaces. */
const text = (v: unknown, max: number) => (typeof v === 'string' ? clip(v.replace(/\s+/g, ' ').trim(), max) : '');
const roleOf = (v: unknown): SlideRole => ((SLIDE_ROLES as readonly unknown[]).includes(v) ? (v as SlideRole) : 'other');

/** One vision call for the whole slideshow, so the model sees the hook → meat → CTA flow. */
export const readSlides = async (saved: SavedSlide[], caption: string, meter: CostMeter): Promise<ReferenceSlide[]> => {
  const raw = await metaAdsJson<{ slides?: RawSlide[] }>(
    [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: `${saved.length} slides. Post caption: ${clip(caption, 300) || '(none)'}` },
          ...saved.map((s) => ({ type: 'image_url' as const, image_url: { url: s.dataUrl, detail: 'high' as const } })),
        ],
      },
    ],
    { maxTokens: 6_000, meter, label: 'OpenAI slide read', timeoutMs: 120_000 },
  );
  const slides = raw.slides ?? [];
  if (slides.length === 0) throw new Error('The vision model returned no slides');
  return saved.map((s, i) => {
    const r = slides[i] ?? {};
    return {
      index: s.index,
      imageKey: s.imageKey,
      width: s.width,
      height: s.height,
      role: roleOf(r.role),
      title: text(r.title, 200),
      body: text(r.body, 400),
      textStyle: text(r.textStyle, 120),
      photo: text(r.photo, 160),
    };
  });
};
