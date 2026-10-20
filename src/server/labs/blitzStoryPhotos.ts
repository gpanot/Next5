// server-only — never import from a 'use client' file.
//
// Photo prompts of Blitz Script Bank stories, one per shot of its card (hook, the five beats, CTA), written once with
// the story (shotPhotos.ts) for the people the owner targets: a batch then only renders them, and a story's pictures
// share one character, one place and the brand's look. One story a call, several calls at once: one call for 4 stories
// took ~40 s, one story ~16 s (2026-10-20).

import type { StoryTexts } from '../slideshow/core/deckAssembly';
import type { ImageNeed } from '../slideshow/core/generatedAssets';
import { writeShotPhotos, type PhotoBrand, type PhotoStory, type ShotPhoto } from '../slideshow/core/shotPhotos';
import { FORMAT_DEFS, type StoryFormat } from './blitzFormats';

export type StoryPhotos = Partial<Record<ImageNeed['role'], ShotPhoto>>;
/** `hook`: the story's first hook, for the opening shot's prompt (a card may open on another of its hooks). */
export type PhotoReady = { id: string; story: StoryTexts; format?: StoryFormat; hook?: string };

const SHOTS = ['hook', 'pain', 'oldWay', 'mechanism', 'proof', 'inaction', 'cta'] as const;
/** Prompt-writing calls running at once. */
const CALLS_AT_ONCE = 8;

/** True when the story has a prompt for every shot, written for these people (the target client). */
export const photosFit = (photos: StoryPhotos | undefined, brand: PhotoBrand): boolean =>
  SHOTS.every((role) => photos?.[role] && (photos[role]!.people ?? null) === (brand.people ?? null));

const photoStory = (s: PhotoReady): PhotoStory => {
  const def = FORMAT_DEFS[s.format ?? 'problem_fix'];
  const beat = (role: Exclude<(typeof SHOTS)[number], 'hook' | 'cta'>) => ({ id: role, role, label: def.labels[role], text: s.story[role], intent: def.intents?.[role] });
  return {
    id: s.id,
    lines: Object.values(s.story).join(' / '),
    shots: [
      { id: 'hook', role: 'hook', label: 'Hook (opening shot)', text: s.hook ?? s.story.pain, intent: 'the moment that stops the scroll: the problem, shown' },
      beat('pain'), beat('oldWay'), beat('mechanism'), beat('proof'), beat('inaction'),
      { id: 'cta', role: 'cta', label: 'Call to action', text: s.story.cta, intent: 'a person using the product in a real situation' },
    ],
  };
};

/** Runs `job` on every item, CALLS_AT_ONCE at a time, in order. */
async function inTurns<T, R>(items: T[], job: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await job(items[i]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CALLS_AT_ONCE, items.length) }, lane));
  return out;
}

/** Prompts for these stories' shots, by story id, earlier stories first. A story whose call failed is missing. */
export async function writeStoryPhotos(brand: PhotoBrand, audience: string, categories: string[], stories: PhotoReady[]): Promise<Map<string, StoryPhotos>> {
  const written = await inTurns(stories, (s) => writeShotPhotos(brand, audience, categories, [photoStory(s)]));
  const out = new Map<string, StoryPhotos>();
  stories.forEach((s, i) => {
    const photos: StoryPhotos = {};
    SHOTS.forEach((role) => {
      const photo = written[i]!.get(`${s.id}:${role}`);
      if (photo) photos[role] = photo;
    });
    if (Object.keys(photos).length > 0) out.set(s.id, photos);
  });
  return out;
}
