// server-only — product photos as shot media ("B2B No Website" flow).
//
// The business's own photos beat stock for the shots about the product (authentic media rule):
//   Mechanism  the photo that best matches the line (the product being made / used)
//   Proof      the best remaining match (finished result, happy customer)
//   CTA        another remaining photo, if any (storefront, clean product shot)
//   Hook       Result-first cards lead with the most striking photo
// Match = cosine similarity between the line and the photo's vision description, plus a bonus
// when the vision model said the photo fits that shot. Each photo plays once per story; with
// fewer photos than shots, the rest stay on library media. Pain / Old way never show the product.

import type { ProductPhoto, ProductPhotoRole } from '../../../../lib/manualProfile';
import { blitzBrowserUrl } from '../../../admin/blitzStore';
import { embedQueries } from '../../../ai/embeddings';
import type { StoryTexts } from '../../core/deckAssembly';
import type { MediaOption, ShotMedia } from '../../core/media';

export type ProductShotKey = 'mechanism' | 'proof' | 'cta';

/** In priority order: with 2 photos, Mechanism and Proof get them. */
export const PRODUCT_SHOTS: ProductShotKey[] = ['mechanism', 'proof', 'cta'];

/** Score bonus when the vision model tagged the photo for this shot (similarities sit ~0.2–0.6). */
const ROLE_BONUS = 0.15;

export type ProductPlan = {
  /** Shot → photos ranked for it; the first one is the pick (distinct across shots). */
  shots: Partial<Record<ProductShotKey, ProductPhoto[]>>;
  /** Most striking photo, for a Result-first hook. */
  hero: ProductPhoto | null;
};

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

const heroRank = (p: ProductPhoto) => (p.bestFor.includes('hook') ? 2 : 0) + (p.bestFor.includes('proof') ? 1 : 0);

/** Picks a product photo per product shot. No photos → empty plan (library media everywhere). */
export async function planProductShots(story: StoryTexts, photos: ProductPhoto[]): Promise<ProductPlan> {
  if (photos.length === 0) return { shots: {}, hero: null };
  const lines = PRODUCT_SHOTS.map((k) => story[k]);
  // No embeddings (API down) → rank by the vision tags alone.
  const vectors = await embedQueries([...lines, ...photos.map((p) => p.description)])
    .catch((): Array<number[] | null> => []);
  const score = (li: number, pi: number, role: ProductPhotoRole): number => {
    const a = vectors[li], b = vectors[lines.length + pi];
    return (a && b ? cosine(a, b) : 0) + (photos[pi]!.bestFor.includes(role) ? ROLE_BONUS : 0);
  };

  const used = new Set<string>();
  const shots: ProductPlan['shots'] = {};
  PRODUCT_SHOTS.forEach((key, li) => {
    const ranked = photos
      .map((p, pi) => ({ p, s: score(li, pi, key) }))
      .sort((x, y) => y.s - x.s)
      .map((r) => r.p);
    const pick = ranked.find((p) => !used.has(p.assetId));
    if (!pick) return;
    used.add(pick.assetId);
    shots[key] = [pick, ...ranked.filter((p) => p !== pick)];
  });
  const hero = [...photos].sort((a, b) => heroRank(b) - heroRank(a))[0] ?? null;
  return { shots, hero };
}

async function productOption(p: ProductPhoto): Promise<MediaOption> {
  const label = p.description.length > 80 ? `${p.description.slice(0, 77)}…` : p.description;
  return {
    mediaUrl: await blitzBrowserUrl(p.r2Key),
    mediaKind: 'image',
    mediaLabel: `Your photo · ${label}`,
    assetId: p.assetId,
    assetKey: p.r2Key,
  };
}

/** First photo as the shot; other photos, then library runner-ups, as swaps (4 max). */
export async function productShot(ranked: ProductPhoto[], librarySwaps: MediaOption[]): Promise<ShotMedia> {
  const [primary, ...rest] = await Promise.all(ranked.slice(0, 3).map(productOption));
  return {
    ...primary!,
    source: 'library',
    photoTag: 'library',
    alternatives: [...rest, ...librarySwaps].slice(0, 4),
  };
}
