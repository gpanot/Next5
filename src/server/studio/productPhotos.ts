// server-only — never import from a 'use client' file.
//
// Reads product photos for the "B2B No Website" flow. One vision call describes every photo in
// plain words and says which shots it fits, so the slideshow engine can (1) write story lines
// about what the photos really show and (2) put the right photo behind the right line.

import { getObjectBuffer } from '../../lib/r2';
import type { ProductPhoto, ProductPhotoRole } from '../../lib/manualProfile';
import { chatJson, isOpenAiEnabled } from '../ai/openai';

const ROLES: ProductPhotoRole[] = ['hook', 'mechanism', 'proof', 'cta'];

const SYSTEM = `You look at photos a small business uploaded of its products and work.
For each photo write:
- "description": one plain sentence (max 25 words) of what the photo shows. Name the product,
  materials, colors, people doing something, the place. Concrete, no marketing words, no guesses about price.
- "bestFor": the video shots it fits, from:
  hook = striking result that stops the scroll,
  mechanism = the product or service being made, used, or delivered,
  proof = finished result or a happy customer with it,
  cta = storefront, packaging, team, or a clean product shot to end on.
Return JSON only: { "photos": [ { "description": "...", "bestFor": ["mechanism"] } ] }, one item per photo, in order.`;

type PhotoIn = { assetId: string; r2Key: string; name: string };

const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

/** R2 object → data URL (the proxy URL needs admin auth, so OpenAI cannot fetch it). */
async function toDataUrl(r2Key: string): Promise<string | null> {
  const ext = r2Key.split('.').pop()?.toLowerCase() ?? '';
  const mime = MIME[ext];
  if (!mime) return null;
  const buffer = await getObjectBuffer(r2Key);
  return buffer ? `data:${mime};base64,${buffer.toString('base64')}` : null;
}

/** Name-based fallback when the vision call fails: the photo is still usable as a product shot. */
const fallback = (p: PhotoIn): ProductPhoto => ({
  assetId: p.assetId,
  r2Key: p.r2Key,
  description: p.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' '),
  bestFor: ['mechanism', 'proof'],
});

/** Describes product photos in one vision call. Never throws: failures keep a name-based fallback. */
export async function describeProductPhotos(photos: PhotoIn[], business: { name: string; promoting: string }): Promise<ProductPhoto[]> {
  if (photos.length === 0) return [];
  if (!isOpenAiEnabled()) return photos.map(fallback);

  const urls = await Promise.all(photos.map((p) => toDataUrl(p.r2Key).catch(() => null)));
  const readable = photos.flatMap((p, i) => (urls[i] ? [{ photo: p, url: urls[i]! }] : []));
  if (readable.length === 0) return photos.map(fallback);

  const result = await chatJson<{ photos?: Array<{ description?: unknown; bestFor?: unknown }> }>(
    [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: `Business: ${business.name} — ${business.promoting}. ${readable.length} photos, in order.` },
          ...readable.map((r) => ({ type: 'image_url' as const, image_url: { url: r.url, detail: 'low' as const } })),
        ],
      },
    ],
    { maxTokens: 80 + readable.length * 90, temperature: 0.2, timeoutMs: 45_000, model: 'gpt-4o-mini' },
  );

  const described = new Map<string, ProductPhoto>();
  readable.forEach((r, i) => {
    const item = result?.photos?.[i];
    const description = typeof item?.description === 'string' ? item.description.trim() : '';
    const bestFor = (Array.isArray(item?.bestFor) ? item.bestFor : [])
      .filter((b): b is ProductPhotoRole => ROLES.includes(b as ProductPhotoRole));
    if (description) {
      described.set(r.photo.assetId, { assetId: r.photo.assetId, r2Key: r.photo.r2Key, description, bestFor: bestFor.length ? bestFor : ['mechanism'] });
    }
  });
  console.log(`[productPhotos] described ${described.size}/${photos.length} photo(s) for ${business.name}`);
  return photos.map((p) => described.get(p.assetId) ?? fallback(p));
}
