// server-only — never import from a 'use client' file.
//
// One AI image per moment in a batch. A deck's stories often repeat a line on the same shot ("More than 500,000
// satisfied users", "KitchenPal tracks your pantry"): each asked for its own image, and the images came back alike.
// Needs of one audience, on the same shot, with nearly the same line, now share one image.

import { wordOverlap } from './copyGuards';
import { generateShotImages, type ImageNeed } from './generatedAssets';
import type { LibraryAsset } from './library';
import type { PhotoBrand } from './shotPhotos';

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
    else groups.push({ audience: n.audience, categories: n.categories, lead: { ...n.need, key: `g${groups.length}:${n.need.key}` }, members: [n] });
  }
  return groups;
}

/**
 * AI images for a batch's needs, all audiences in parallel, one per moment (groupNeeds). Each image is saved to the
 * library (categories, description, embedding) for the next deck. Returns, per script (0…scripts-1), need key → image.
 */
export async function makeBatchImages(needs: BatchNeed[], scripts: number, workspaceId: string | null, brand: PhotoBrand): Promise<Array<Map<string, LibraryAsset>>> {
  const out = Array.from({ length: scripts }, () => new Map<string, LibraryAsset>());
  const groups = groupNeeds(needs);
  const audiences = [...new Set(groups.map((g) => g.audience))];
  const made = await Promise.all(audiences.map((audience) => {
    const mine = groups.filter((g) => g.audience === audience);
    return generateShotImages(audience, mine[0]!.categories, mine.map((g) => g.lead), workspaceId, brand);
  }));
  const images = new Map(made.flatMap((m) => [...m]));
  for (const g of groups) {
    const image = images.get(g.lead.key);
    if (image) g.members.forEach((n) => out[n.script]!.set(n.need.key, image));
  }
  if (needs.length > 0) console.log(`[imageNeeds] ${needs.length} shot(s) needed an image: ${groups.length} moment(s), ${images.size} made`);
  return out;
}
