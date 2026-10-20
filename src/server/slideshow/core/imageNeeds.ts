// server-only — never import from a 'use client' file.
//
// One AI image per moment in a batch. A deck's stories often repeat a line on the same shot ("More than 500,000
// satisfied users", "KitchenPal tracks your pantry"): each asked for its own image, and the images came back alike.
// Needs of one audience, on the same shot, with nearly the same line, now share one image.
// Paid workspaces get Nano Banana 2.1 images. The others get cheap GPT Image 2 (low, ~$0.004) images since 2026-10-20
// (an experiment: stock photos often missed the line); FREE_IMAGES = 'stock' brings stock photos back (stockImages.ts).

import type { ReapiModelId } from '../../../config/reapiModels';
import { workspaceGetsAiImages } from '../../slideshowCredits/paid';
import { wordOverlap } from './copyGuards';
import { generateShotImages, type ImageNeed } from './generatedAssets';
import type { LibraryAsset } from './library';
import type { PhotoBrand } from './shotPhotos';
import { newStockUsed, stockShotImages } from './stockImages';

/** What workspaces that have not paid get: cheap AI images, or stock photos (before 2026-10-20). */
const FREE_IMAGES = 'cheap_ai' as 'cheap_ai' | 'stock';
/**
 * Paid workspaces get the free plan's images too (cheap model, images-only cards in batches) while a client tests them
 * (user, 2026-10-20: Nano Banana runs 10 at a time at ~45 s an image, so paid batches were slow). false = paid
 * workspaces get Nano Banana 2.1 again, and their batches no images-only cards.
 */
export const PAID_LIKE_FREE = true;

/** The cheap image model of free workspaces: GPT Image 2, low quality, 1K. */
export const FREE_IMAGE_MODEL: ReapiModelId = 'reapi-gpt-image-2-low';

/** Shared words (Jaccard) from which two lines show the same moment. */
export const SAME_MOMENT_OVERLAP = 0.6;

/** One shot of one script that needs an image. */
export type BatchNeed = { script: number; audience: string; categories: string[]; need: ImageNeed };

/** Needs that share an image: the first one's line is the one drawn. */
export type NeedGroup = { audience: string; categories: string[]; lead: ImageNeed; members: BatchNeed[] };

const sameMoment = (a: BatchNeed, b: BatchNeed) =>
  a.audience === b.audience && a.need.role === b.need.role
  && (a.need.text.trim().toLowerCase() === b.need.text.trim().toLowerCase() || wordOverlap(a.need.text, b.need.text) >= SAME_MOMENT_OVERLAP);

/** Groups a batch's needs by moment, in first-seen order. Each group's lead gets a key unique in the batch. */
export function groupNeeds(needs: BatchNeed[]): NeedGroup[] {
  const groups: NeedGroup[] = [];
  for (const n of needs) {
    const group = groups.find((g) => sameMoment(g.members[0]!, n));
    if (group) group.members.push(n);
    else groups.push({ audience: n.audience, categories: n.categories, lead: { ...n.need, key: `g${groups.length}:${n.need.key}`, priority: n.script }, members: [n] });
  }
  return groups;
}

/** Images for one audience's moments (their lead needs), telling each as it settles. Returns lead key → image. */
type MakeImages = (audience: string, categories: string[], leads: ImageNeed[], onImage: (key: string, image: LibraryAsset | null) => void) => Promise<Map<string, LibraryAsset>>;

/** Told once per script with needs, as soon as all its moments settled (or at the end): need key → image. */
export type OnScriptImages = (script: number, images: Map<string, LibraryAsset>) => void;

/**
 * One image per moment (groupNeeds), all audiences in parallel. `onScript`: each script's images as soon as they are
 * all made, so its card need not wait for the batch. Returns, per script (0…scripts-1), need key → image.
 */
async function makeBatch(needs: BatchNeed[], scripts: number, make: MakeImages, what: string, onScript?: OnScriptImages): Promise<Array<Map<string, LibraryAsset>>> {
  const out = Array.from({ length: scripts }, () => new Map<string, LibraryAsset>());
  const groups = groupNeeds(needs);
  const byLead = new Map(groups.map((g) => [g.lead.key, g]));
  const scriptsOf = (g: NeedGroup) => [...new Set(g.members.map((n) => n.script))];
  const left = new Map<number, number>();
  groups.forEach((g) => scriptsOf(g).forEach((s) => left.set(s, (left.get(s) ?? 0) + 1)));
  const told = new Set<number>();
  const tell = (s: number) => {
    if (told.has(s)) return;
    told.add(s);
    onScript?.(s, out[s]!);
  };
  const settle = (key: string, image: LibraryAsset | null) => {
    const g = byLead.get(key);
    if (!g) return;
    if (image) g.members.forEach((n) => out[n.script]!.set(n.need.key, image));
    scriptsOf(g).forEach((s) => {
      left.set(s, left.get(s)! - 1);
      if (left.get(s) === 0) tell(s);
    });
  };
  const audiences = [...new Set(groups.map((g) => g.audience))];
  const made = await Promise.all(audiences.map((audience) => {
    const mine = groups.filter((g) => g.audience === audience);
    return make(audience, mine[0]!.categories, mine.map((g) => g.lead), settle);
  }));
  const images = new Map(made.flatMap((m) => [...m]));
  for (const g of groups) {
    const image = images.get(g.lead.key);
    if (image) g.members.forEach((n) => out[n.script]!.set(n.need.key, image));
  }
  // Scripts whose moments were never told (no prompt written, stock photos): now, with what was made.
  [...left.keys()].forEach(tell);
  if (needs.length > 0) console.log(`[imageNeeds] ${needs.length} shot(s) needed an image: ${groups.length} moment(s), ${images.size} ${what}`);
  return out;
}

/**
 * AI images for a batch's needs, one per moment. Each image is saved to the library (categories, description,
 * embedding) for the next deck. `model`: Nano Banana 2.1 unless given. Returns, per script (0…scripts-1), need key → image.
 */
export const makeBatchImages = (needs: BatchNeed[], scripts: number, workspaceId: string | null, brand: PhotoBrand, model?: ReapiModelId, onScript?: OnScriptImages) =>
  makeBatch(needs, scripts, (audience, categories, leads, onImage) => generateShotImages(audience, categories, leads, workspaceId, brand, model, onImage), 'made', onScript);

/** Stock photos instead (stockImages.ts), one per moment, never the same photo twice in the batch. Saved to the library too. */
export const makeBatchStock = (needs: BatchNeed[], scripts: number, workspaceId: string | null, brand: PhotoBrand, onScript?: OnScriptImages) => {
  const used = newStockUsed();
  return makeBatch(needs, scripts, (audience, categories, leads) => stockShotImages(audience, categories, leads, workspaceId, brand, used), 'stock found', onScript);
};

/** True when the workspace gets paid AI images; false (free images) when the check fails. */
export const getsPaidImages = (workspaceId: string | null) =>
  workspaceGetsAiImages(workspaceId).catch((err: unknown) => {
    console.warn('[imageNeeds] paid check failed, using free images:', err instanceof Error ? err.message : err);
    return false;
  });

/**
 * The batch's images by plan: AI images once the workspace's owner has paid (unless they test as free), free images
 * before. `onScript`: each script's images as soon as they are made.
 */
export const batchShotImages = async (needs: BatchNeed[], scripts: number, workspaceId: string | null, brand: PhotoBrand, onScript?: OnScriptImages) => {
  if (needs.length === 0) return Array.from({ length: scripts }, () => new Map<string, LibraryAsset>());
  if (!PAID_LIKE_FREE && (await getsPaidImages(workspaceId))) return makeBatchImages(needs, scripts, workspaceId, brand, undefined, onScript);
  return FREE_IMAGES === 'stock'
    ? makeBatchStock(needs, scripts, workspaceId, brand, onScript)
    : makeBatchImages(needs, scripts, workspaceId, brand, FREE_IMAGE_MODEL, onScript);
};
