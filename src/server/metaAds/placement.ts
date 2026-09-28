// server-only — never import from a 'use client' file.
// The image is generated before the hook is placed, so the hook can land on a face. After each image, a vision call
// finds the face (or main product) and the code puts the hook in the zone that does not cover it.

import type { CostMeter } from './cost';
import { isCaptionStyle, type TextPlacement } from './composite';
import { toDataUrl } from './hormozi/vision';
import { metaAdsJson } from './llm';

type Band = { top: number; bottom: number };

/** Vertical bands (0 = top, 1 = bottom of the 1080×1350 ad) each layout's text covers, matching composite.tsx. */
const ZONES: Record<'caption' | 'headline', Record<TextPlacement, Band>> = {
  caption: { top: { top: 0.12, bottom: 0.32 }, bottom: { top: 0.72, bottom: 0.9 } },
  headline: { top: { top: 0.08, bottom: 0.42 }, bottom: { top: 0.58, bottom: 0.94 } },
};

/** Overlap below this share of the ad's height is tolerated (a chin edge, a shoulder). */
const TOLERANCE = 0.02;

const overlap = (a: Band, b: Band) => Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

export const defaultPlacement = (style: string): TextPlacement => (isCaptionStyle(style) ? 'bottom' : 'top');

/** The layout's usual spot unless it covers the key area and the other spot covers less. Pure, unit-tested. */
export const choosePlacement = (style: string, keyArea: Band | null): TextPlacement => {
  const preferred = defaultPlacement(style);
  if (!keyArea) return preferred;
  const zones = ZONES[isCaptionStyle(style) ? 'caption' : 'headline'];
  const other: TextPlacement = preferred === 'top' ? 'bottom' : 'top';
  const here = overlap(zones[preferred], keyArea);
  return here > TOLERANCE && overlap(zones[other], keyArea) < here ? other : preferred;
};

const SYSTEM = `Find the most important area of this ad photo: the main person's face (forehead to chin, face only),
or the main product when there is no person. Report its vertical extent as fractions of the image height (0 = top edge, 1 = bottom edge).
Return JSON: {"kind": "face" | "product" | "none", "top": number, "bottom": number}`;

/** Where the hook should go on this image. Falls back to the layout's usual spot when the image cannot be read. */
export const placeText = async (imageUrl: string, style: string, meter: CostMeter): Promise<TextPlacement> => {
  if (style === 'Bold text') return 'top';
  try {
    const raw = await metaAdsJson<{ kind?: string; top?: unknown; bottom?: unknown }>(
      [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: [{ type: 'image_url', image_url: { url: await toDataUrl(imageUrl), detail: 'low' } }] },
      ],
      { maxTokens: 2_000, meter, label: 'OpenAI text placement' },
    );
    const top = Number(raw.top);
    const bottom = Number(raw.bottom);
    const valid = raw.kind !== 'none' && Number.isFinite(top) && Number.isFinite(bottom) && top >= 0 && bottom <= 1 && top < bottom;
    return choosePlacement(style, valid ? { top, bottom } : null);
  } catch (err) {
    console.warn('[meta-ads] text placement failed, using the default spot:', err instanceof Error ? err.message : err);
    return defaultPlacement(style);
  }
};
