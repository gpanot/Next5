// server-only — never import from a 'use client' file.
// Photos of a short whose brand has a Visual Bible: storyboard + shot plans, then the anchor photo (main character +
// hero product), then every beat's photo made with the anchor as a reference image, each checked once (photoQa.ts).
// A/B tested on EQL and Porsche 2026-10-09: the same person and the same car in all 7 shots, where the classic prompts
// gave a different person in every shot and a car that changed model between shots.

import type { CostMeter } from '../metaAds/cost';
import { presignObject } from '../storage/objectStore';
import type { ShortBeat, ShortInputs, ShortPhotoModel, ShotQa } from '../../types/admin/shorts';
import type { VisualBible } from '../../types/admin/visualBible';
import { makePhoto } from './media';
import { checkPhoto } from './photoQa';
import { anchorPrompt, biblePhotoPrompt, planBibleVisuals } from './storyboard';

/** Stores a photo under a name ("anchor", "frame-0") and returns its storage key. */
export type SavePhoto = (name: string, photo: Buffer) => Promise<string>;

export type BiblePhotos = { beats: ShortBeat[]; anchorKey?: string; anchorPrompt: string };

/** The anchor as a public URL the image and vision models can fetch; null when it failed or storage is local. */
const makeAnchor = async (prompt: string, model: ShortPhotoModel, save: SavePhoto, meter: CostMeter): Promise<{ key: string; url: string | null } | null> => {
  try {
    const key = await save('anchor', await makePhoto(prompt, meter, [], model));
    const url = await presignObject(key, 60 * 60);
    return { key, url: url?.startsWith('https://') ? url : null };
  } catch (err) {
    console.warn('[shorts] anchor photo failed, shots made without a reference:', err instanceof Error ? err.message.slice(0, 160) : err);
    return null;
  }
};

type BeatPhotoJob = { bible: VisualBible; anchorUrl: string | null; model: ShortPhotoModel; save: SavePhoto; meter: CostMeter };

/** One beat's photo: made, checked, and made once more with the check's fix when it failed. */
const beatPhoto = async (beat: ShortBeat, { bible, anchorUrl, model, save, meter }: BeatPhotoJob): Promise<ShortBeat> => {
  const refs = anchorUrl ? [anchorUrl] : [];
  const prompt = biblePhotoPrompt(beat, bible, refs.length > 0);
  let photo = await makePhoto(prompt, meter, refs, model);
  const first = await checkPhoto(photo, beat, prompt, anchorUrl, meter);
  let qa: ShotQa = { ok: first.ok, retried: false, ...(first.ok ? {} : { problem: first.problem }) };
  if (!first.ok) {
    const retryPrompt = `${prompt} ${first.fix}`.trim();
    photo = await makePhoto(retryPrompt, meter, refs, model);
    const second = await checkPhoto(photo, beat, retryPrompt, anchorUrl, meter);
    qa = { ok: second.ok, retried: true, firstProblem: first.problem, fix: first.fix, ...(second.ok ? {} : { problem: second.problem }) };
  }
  return { ...beat, imageKey: await save(`frame-${beat.idx}`, photo), qa };
};

export const makeBiblePhotos = async (
  beats: ShortBeat[],
  narration: string,
  inputs: ShortInputs,
  bible: VisualBible,
  model: ShortPhotoModel,
  save: SavePhoto,
  meter: CostMeter,
): Promise<BiblePhotos> => {
  const planned = await planBibleVisuals(beats, narration, inputs, bible, meter);
  const prompt = anchorPrompt(bible, planned);
  const anchor = await makeAnchor(prompt, model, save, meter);
  const job: BeatPhotoJob = { bible, anchorUrl: anchor?.url ?? null, model, save, meter };
  const done = await Promise.all(planned.map((b) => beatPhoto(b, job)));
  return { beats: done, anchorKey: anchor?.key, anchorPrompt: prompt };
};
