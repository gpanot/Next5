// server-only — never import from a 'use client' file.
// Tags a set of listing photo thumbnails by room type for use in slideshow copy matching.

import { isPhotoTag, type PhotoTag } from '../../lib/listingPhotos';
import { chatJson, isOpenAiEnabled } from '../ai/openai';

const MAX_PHOTOS = 40;

const SYSTEM = `You label real estate listing photos by what they mainly show.
Allowed labels: exterior, porch, living, kitchen, dining, bedroom, yard, bath, aerial, detail, floorplan, other.
exterior = the front or outside of the house. porch = front porch, patio, or entry up close.
yard = backyard, garden, pool or deck. aerial = drone or map view. detail = close-up of a fixture or finish.
other = anything that doesn't clearly fit another label.
Return JSON: {"tags": ["label for photo 1", "label for photo 2", …]} with exactly one label per photo, in order.`;

const isValidTag = (v: unknown): v is PhotoTag | 'other' =>
  isPhotoTag(v) || v === 'other';

/**
 * Tags listing photo thumbnails by room type.
 * Returns one tag per URL in order via a single vision call (low-detail thumbnails).
 * Fallback on any failure: first photo → 'exterior', rest → 'other'.
 */
export const tagListingPhotos = async (urls: string[]): Promise<(PhotoTag | 'other')[]> => {
  const fallback = (): (PhotoTag | 'other')[] =>
    urls.map((_, i) => (i === 0 ? 'exterior' : 'other'));

  if (urls.length === 0) return [];
  if (!isOpenAiEnabled()) return fallback();

  const batch = urls.slice(0, MAX_PHOTOS);

  const result = await chatJson<{ tags?: unknown }>(
    [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: `${batch.length} photos, in order.` },
          ...batch.map((url) => ({ type: 'image_url' as const, image_url: { url, detail: 'low' as const } })),
        ],
      },
    ],
    { maxTokens: 20 + batch.length * 10, temperature: 0, timeoutMs: 25_000, model: 'gpt-4o-mini' },
  );

  if (!result || !Array.isArray(result.tags)) return fallback();

  const tags = result.tags as unknown[];
  return urls.map((_, i) => {
    const raw = typeof tags[i] === 'string' ? (tags[i] as string).trim().toLowerCase() : null;
    return isValidTag(raw) ? raw : i === 0 ? 'exterior' : 'other';
  });
};
