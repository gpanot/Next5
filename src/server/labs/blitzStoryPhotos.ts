// server-only — never import from a 'use client' file.
//
// Photo prompts of Blitz Script Bank stories, one per story shot that may need an AI image (pain, old way, fix, proof,
// cost of waiting), written once with the story (shotPhotos.ts): a batch then only renders them, and a story's
// pictures share one character, one place and the brand's look.

import type { StoryTexts } from '../slideshow/core/deckAssembly';
import type { ImageNeed } from '../slideshow/core/generatedAssets';
import { writeShotPhotos, type PhotoBrand, type PhotoStory, type ShotPhoto } from '../slideshow/core/shotPhotos';
import { FORMAT_DEFS, type StoryFormat } from './blitzFormats';

export type StoryPhotos = Partial<Record<ImageNeed['role'], ShotPhoto>>;
type PhotoReady = { id: string; story: StoryTexts; format?: StoryFormat };

const SHOTS: Array<ImageNeed['role']> = ['pain', 'oldWay', 'mechanism', 'proof', 'inaction'];
/** Stories per call: 5 prompts each keeps a reply well under the token cap. */
const PER_CALL = 4;

const photoStory = (s: PhotoReady): PhotoStory => {
  const def = FORMAT_DEFS[s.format ?? 'problem_fix'];
  return {
    id: s.id,
    lines: Object.values(s.story).join(' / '),
    shots: SHOTS.map((role) => ({ id: role, role, label: def.labels[role], text: s.story[role], intent: def.intents?.[role] })),
  };
};

/** Prompts for these stories' shots, by story id (calls in parallel). A story whose call failed is missing. */
export async function writeStoryPhotos(brand: PhotoBrand, audience: string, categories: string[], stories: PhotoReady[]): Promise<Map<string, StoryPhotos>> {
  const chunks = Array.from({ length: Math.ceil(stories.length / PER_CALL) }, (_, i) => stories.slice(i * PER_CALL, (i + 1) * PER_CALL));
  const written = await Promise.all(chunks.map((chunk) => writeShotPhotos(brand, audience, categories, chunk.map(photoStory))));
  const out = new Map<string, StoryPhotos>();
  for (const s of stories) {
    const photos: StoryPhotos = {};
    SHOTS.forEach((role) => {
      const photo = written.find((m) => m.has(`${s.id}:${role}`))?.get(`${s.id}:${role}`);
      if (photo) photos[role] = photo;
    });
    if (Object.keys(photos).length > 0) out.set(s.id, photos);
  }
  return out;
}
