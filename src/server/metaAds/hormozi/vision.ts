// server-only — never import from a 'use client' file.
// Step 3a: read image ads with a vision model. The model reports what it SEES (format, printed words, subject);
// judgement is limited to two scores, each read twice. The offer check is computed from the printed words.

import sharp from 'sharp';
import { CREATIVE_ARCHETYPES, type CompetitorAd, type CreativeArchetype, type CreativeRead } from '../../../types/admin/metaAds';
import type { CostMeter } from '../cost';
import { metaAdsJson } from '../llm';
import { clip } from '../text';

/** Image first: video and carousel ads are skipped for now. DCO = dynamic creative, served as images. */
const IMAGE_FORMATS = new Set(['IMAGE', 'DCO']);
const MAX_READS = 16;

const SYSTEM = `You look at one Meta ad image and report what is in it. Facts, not opinions, except the two scores.
- archetype: one of ${CREATIVE_ARCHETYPES.join(', ')}
- onImageText: every word printed on the image, exactly as written ("" if none)
- subject: what the image shows, max 12 words
- hasPerson, productVisible: booleans
- thumbStop: 0-3, would it stop a thumb scrolling a feed on a phone? 0 generic stock look · 1 plain · 2 one strong focal point or bold claim · 3 impossible to miss. "because": the visible element that earns it.
- clarity: 0-3, can you tell what is sold and why in one second? "because": what makes it clear or not.
Return JSON: {"archetype","onImageText","subject","hasPerson","productVisible","thumbStop":{"score","because"},"clarity":{"score","because"}}`;

type RawRead = Partial<{
  archetype: string;
  onImageText: string;
  subject: string;
  hasPerson: boolean;
  productVisible: boolean;
  thumbStop: { score?: unknown; because?: unknown };
  clarity: { score?: unknown; because?: unknown };
}>;

export const isImageAd = (ad: CompetitorAd) => IMAGE_FORMATS.has(ad.format) && Boolean(ad.imageUrl);

/** Downloads and shrinks the image: model providers cannot always fetch Facebook's signed URLs. */
export const toDataUrl = async (url: string): Promise<string> => {
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`image ${res.status}`);
  const jpeg = await sharp(Buffer.from(await res.arrayBuffer())).resize(768, 768, { fit: 'inside' }).jpeg({ quality: 80 }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
};

const OFFER_RE = /[$£€]\s?\d|\d+\s?%|\bfree\b|\boff\b|\bsale\b|\bdeal\b/i;

const score = (v: unknown) => Math.max(0, Math.min(3, Math.round(Number(v) || 0)));
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Two reads of a judged score: close → the rounded-down mean; far apart → the lower one, flagged. */
const merge = (a: number, b: number) => ({ score: Math.abs(a - b) > 1 ? Math.min(a, b) : Math.floor((a + b) / 2), unstable: Math.abs(a - b) > 1 });

export const visualScore = (r: Pick<CreativeRead, 'thumbStop' | 'clarity' | 'productVisible' | 'offerOnImage'>) =>
  Math.round((r.thumbStop.score / 3) * 40 + (r.clarity.score / 3) * 30 + (r.productVisible ? 15 : 0) + (r.offerOnImage ? 15 : 0));

const readOnce = (image: string, meter: CostMeter) =>
  metaAdsJson<RawRead>(
    [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: [{ type: 'image_url', image_url: { url: image, detail: 'low' } }] },
    ],
    { maxTokens: 3_000, meter, label: 'OpenAI vision read' },
  );

const readCreative = async (ad: CompetitorAd, meter: CostMeter): Promise<CreativeRead | null> => {
  try {
    const image = await toDataUrl(ad.imageUrl as string);
    const [a, b] = await Promise.all([readOnce(image, meter), readOnce(image, meter)]);
    const thumb = merge(score(a.thumbStop?.score), score(b.thumbStop?.score));
    const clear = merge(score(a.clarity?.score), score(b.clarity?.score));
    const onImageText = text(a.onImageText);
    const base = {
      archetype: ((CREATIVE_ARCHETYPES as readonly string[]).includes(text(a.archetype)) ? text(a.archetype) : 'other') as CreativeArchetype,
      onImageText,
      subject: clip(text(a.subject), 120),
      hasPerson: a.hasPerson === true,
      productVisible: a.productVisible === true,
      offerOnImage: OFFER_RE.test(onImageText),
      thumbStop: { score: thumb.score, because: text(a.thumbStop?.because) },
      clarity: { score: clear.score, because: text(a.clarity?.because) },
      unstable: thumb.unstable || clear.unstable,
    };
    return { ...base, visualScore: visualScore(base) };
  } catch (err) {
    console.warn(`[meta-ads] vision read of ${ad.id} failed:`, err instanceof Error ? err.message : err);
    return null;
  }
};

/** Reads up to MAX_READS image ads (in the order given, best evidence first). Failed reads are simply absent. */
export const readCreatives = async (ads: CompetitorAd[], meter: CostMeter): Promise<Map<string, CreativeRead>> => {
  const targets = ads.filter(isImageAd).slice(0, MAX_READS);
  const reads = await Promise.all(targets.map(async (ad) => [ad.id, await readCreative(ad, meter)] as const));
  return new Map(reads.filter((r): r is readonly [string, CreativeRead] => r[1] !== null));
};
