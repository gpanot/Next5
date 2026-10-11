// server-only — never import from a 'use client' file.
// Stock photos for the Content tab's "Auto": before Unsplash (50 calls an hour), each slide's search is tried on the
// workspace's own brand photos, then on the shared library, by the words of their descriptions. A library photo is
// used once per run of Auto; a slide with no good match falls back to Unsplash.

import type { CampaignPhotoRef, PhotoOptionDto } from '../../../types/admin/slideshowCampaign';
import { brandOptions, sharedOptions } from './photos';

/** Words that say nothing about what a photo shows. */
const STOP = new Set(['the', 'and', 'with', 'for', 'from', 'into', 'over', 'photo', 'image', 'picture', 'shot', 'view']);

/** Lowercase content words, plural "s" dropped, so "golf balls" matches "golf ball". */
const wordsOf = (text: string): string[] =>
  text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w)).map((w) => (w.length > 3 ? w.replace(/s$/, '') : w));

/** How many of the query's words the label has; a match needs 2 (or the only word of a one-word query). */
const scoreOf = (query: string[], label: Set<string>): number => {
  const hits = query.filter((w) => label.has(w)).length;
  return hits >= Math.min(2, query.length) ? hits : 0;
};

type Candidate = { ref: CampaignPhotoRef; words: Set<string>; brand: boolean };

/** The best unused library photo for the query (brand photos win a tie), or null. */
const bestFor = (query: string, pool: Candidate[], used: Set<string>): CampaignPhotoRef | null => {
  const words = wordsOf(query);
  if (words.length === 0) return null;
  let best: { c: Candidate; score: number } | null = null;
  for (const c of pool) {
    const key = `${c.ref.source}:${'id' in c.ref ? c.ref.id : ''}`;
    if (used.has(key)) continue;
    const score = scoreOf(words, c.words) + (c.brand ? 0.5 : 0);
    if (score >= 1 && (!best || score > best.score)) best = { c, score };
  }
  if (!best) return null;
  used.add(`${best.c.ref.source}:${'id' in best.c.ref ? best.c.ref.id : ''}`);
  return best.c.ref;
};

const candidates = (options: PhotoOptionDto[], brand: boolean): Candidate[] => options.map((o) => ({ ref: o.ref, words: new Set(wordsOf(o.label)), brand }));

/** Per query, a matching brand or shared photo (each used once), or null; and one for the cover query. */
export const matchLibrary = async (workspaceId: string, queries: string[], coverQuery: string): Promise<{ libraryRefs: (CampaignPhotoRef | null)[]; coverRef: CampaignPhotoRef | null }> => {
  const [brand, shared] = await Promise.all([brandOptions(workspaceId), sharedOptions(workspaceId)]);
  const pool = [...candidates(brand, true), ...candidates(shared, false)];
  const coverRef = bestFor(coverQuery, pool, new Set());
  const used = new Set<string>();
  return { libraryRefs: queries.map((q) => bestFor(q, pool, used)), coverRef };
};
