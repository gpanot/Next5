// server-only — never import from a 'use client' file.
// One vision call tags a gallery by room type, so the pick screen can preselect the photos that work.

import { PHOTO_TAGS, isPhotoTag, type PhotoTag } from '../../lib/listingPhotos';
import { chatJson, isOpenAiEnabled } from '../ai/openai';

/** Larger galleries: the rest stay untagged (still selectable). */
export const MAX_TAGGED = 40;

const SYSTEM = `You label real estate listing photos by what they mainly show.
Allowed labels: ${PHOTO_TAGS.join(', ')}.
exterior = the front or outside of the house from the ground. porch = a front porch, patio or entry up close.
yard = backyard, garden, pool or deck. aerial = drone or map view. detail = a close-up of a fixture or finish.
Return JSON: {"tags": ["label for photo 1", "label for photo 2", …]} with exactly one label per photo, in order.`;

/** Tags in gallery order; null where the call failed, returned junk, or the photo was beyond MAX_TAGGED. */
export const tagPhotos = async (thumbUrls: readonly string[]): Promise<(PhotoTag | null)[]> => {
  const empty = thumbUrls.map(() => null);
  if (thumbUrls.length === 0 || !isOpenAiEnabled()) return empty;
  const batch = thumbUrls.slice(0, MAX_TAGGED);
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
    { maxTokens: 20 + batch.length * 8, temperature: 0, timeoutMs: 25_000 },
  );
  const tags = Array.isArray(result?.tags) ? result.tags : [];
  return thumbUrls.map((_, i) => {
    const tag = typeof tags[i] === 'string' ? tags[i].trim().toLowerCase() : null;
    return isPhotoTag(tag) ? tag : null;
  });
};
