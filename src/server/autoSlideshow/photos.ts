// server-only — never import from a 'use client' file.
// Step 5: the run's shared mood photos, on Grok Imagine 2 official (reAPI, 864x1152 3:4 cropped to 4:5). Each photo is copied
// to the object store right away: reAPI result links expire, and step 6 renders from our copy.

import { REAPI_MODELS, type ReapiModelId } from '../../config/reapiModels';
import { pollGeminiImage, submitReapiImage } from '../../lib/reapiImage';
import type { AutoPhoto, HeadBox } from '../../types/admin/autoSlideshow';
import type { CostMeter } from '../metaAds/cost';
import { clip } from '../metaAds/text';
import { runPool } from '../pool';
import { putObject } from '../storage/objectStore';
import { detectHeads } from './heads';
import { compressJpeg, PHOTO_SIZE } from './jpeg';

export const PHOTO_MODEL: ReapiModelId = 'reapi-grok-imagine-2-official';
/** Grok Imagine 2 has no 4:5; 3:4 is the closest, and the 4:5 crop trims a little top and bottom. */
const PHOTO_RATIO = '3:4';
/** reAPI allows 10 tasks in flight per account; 5 leaves room for Perfect Ads and retries. */
const CONCURRENCY = 5;
const FIRST_POLL_MS = 8_000;
const POLL_MS = 3_000;
const TIMEOUT_MS = 180_000;
const SUBMIT_ATTEMPTS = 4;
const BUSY_WAIT_MS = 15_000;

// Keep this bright. "Cinematic light" made GPT Image 2 return dark, moody photos (mean luma 85-140 of 255); this wording
// gave 164-173 on the same scenes (A/B test 2026-09-29). White slide text still reads thanks to its outline.
const STYLE = 'Bright, airy, well-exposed photograph in daylight, high-key, true-to-life colors, clean and inviting, shallow depth of field, vertical framing: people stand in the lower half of the frame with their heads below the middle, and the upper 40% is open sky, wall or plain background. No text, no letters, no logos, no watermarks, no phone screens.';

export const photoKey = (runId: string, index: number) => `admin/auto-slideshow/${runId}/photos/${index}.jpg`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const submit = async (prompt: string) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await submitReapiImage({ model: PHOTO_MODEL, prompt, imageUrls: [], ratio: PHOTO_RATIO, highRes: false });
    } catch (err) {
      const busy = err instanceof Error && err.message.includes('(429)');
      if (!busy || attempt >= SUBMIT_ATTEMPTS) throw err;
      await sleep(BUSY_WAIT_MS * attempt);
    }
  }
};

type MadePhoto = { key: string; heads: HeadBox[] | null };

/** One photo, generated and stored as a 1440x1800 JPEG under 1 MB, with its heads found so step 6 keeps text off them. */
const makePhoto = async (runId: string, index: number, prompt: string, look: string | undefined, meter: CostMeter): Promise<MadePhoto> => {
  const { taskId } = await submit([prompt, look && `Brand look: ${look}`, STYLE].filter(Boolean).join(' '));
  const deadline = Date.now() + TIMEOUT_MS;
  await sleep(FIRST_POLL_MS);
  while (Date.now() < deadline) {
    const result = await pollGeminiImage(taskId);
    if (result.status === 'completed' && result.url) {
      // reAPI bills finished images only.
      meter.add(`Photo (${REAPI_MODELS[PHOTO_MODEL].label})`, REAPI_MODELS[PHOTO_MODEL].priceUsdMicros['1k']);
      const res = await fetch(result.url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`photo download failed (${res.status})`);
      const jpeg = await compressJpeg(Buffer.from(await res.arrayBuffer()), PHOTO_SIZE);
      const key = photoKey(runId, index);
      await putObject(key, jpeg, 'image/jpeg');
      return { key, heads: await detectHeads(`data:image/jpeg;base64,${jpeg.toString('base64')}`) };
    }
    if (result.status === 'failed') throw new Error(result.error ?? 'Photo generation failed');
    await sleep(POLL_MS);
  }
  throw new Error('Photo generation timed out');
};

/** `deadline`: no new photo starts after it (the rest stay untried for the next invocation). `skipFailed`: a continued
 *  pass leaves photos that already failed, so retries do not eat its time. `look`: the brand's photo style, added to
 *  every prompt (banks built before the style existed get it this way too). */
export type MakePhotosOptions = { deadline?: number; skipFailed?: boolean; look?: string };

/**
 * Generates every photo not stored yet (a resumed run keeps the ones it has). A failed photo is recorded, not fatal;
 * the step fails only when fewer photos exist than the longest slideshow needs.
 */
export const makePhotos = async (runId: string, prompts: string[], existing: AutoPhoto[] | null, meter: CostMeter, options: MakePhotosOptions = {}): Promise<AutoPhoto[]> => {
  const photos: AutoPhoto[] = prompts.map((prompt, i) => {
    const prior = existing?.[i];
    if (prior?.prompt !== prompt) return { prompt, imageKey: null, error: null };
    if (prior.imageKey || prior.deleted || (options.skipFailed && prior.error)) return prior;
    const { kind, owner } = prior;
    return { prompt, imageKey: null, error: null, ...(kind ? { kind } : {}), ...(owner ? { owner } : {}) };
  });
  const todo = photos.map((p, i) => ({ p, i })).filter(({ p }) => !p.imageKey && !p.deleted && !p.error);
  await runPool(todo, CONCURRENCY, async ({ p, i }) => {
    if (options.deadline && Date.now() > options.deadline) return;
    try {
      const { key, heads } = await makePhoto(runId, i, p.prompt, options.look, meter);
      // Unknown heads (detection failed) stay unset, so step 6 tries again.
      photos[i] = { ...p, imageKey: key, error: null, ...(heads ? { heads } : {}) };
    } catch (err) {
      photos[i] = { ...p, imageKey: null, error: clip(err instanceof Error ? err.message : String(err), 300) };
    }
  });
  return photos;
};
