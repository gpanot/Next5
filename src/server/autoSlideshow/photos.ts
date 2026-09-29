// server-only — never import from a 'use client' file.
// Step 5: the run's shared mood photos, on Grok Imagine (reAPI, 2K, 3:4 cropped to 4:5). Each photo is copied
// to the object store right away: reAPI result links expire, and step 6 renders from our copy.

import sharp from 'sharp';
import { REAPI_MODELS, type ReapiModelId } from '../../config/reapiModels';
import { pollGeminiImage, submitReapiImage } from '../../lib/reapiImage';
import type { AutoPhoto } from '../../types/admin/autoSlideshow';
import type { CostMeter } from '../metaAds/cost';
import { clip } from '../metaAds/text';
import { runPool } from '../pool';
import { putObject } from '../storage/objectStore';

export const PHOTO_MODEL: ReapiModelId = 'reapi-grok-imagine';
/** Grok Imagine has no 4:5; 3:4 is the closest, and the 1080x1350 crop trims a little top and bottom. */
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
const STYLE = 'Bright, airy, well-exposed photograph in daylight, high-key, true-to-life colors, clean and inviting, shallow depth of field, vertical framing with calm space in the upper half. No text, no letters, no logos, no watermarks, no phone screens.';

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

/** One photo, generated and stored as a 1080x1350 JPEG. Returns its key. */
const makePhoto = async (runId: string, index: number, prompt: string, meter: CostMeter): Promise<string> => {
  const { taskId } = await submit(`${prompt} ${STYLE}`);
  const deadline = Date.now() + TIMEOUT_MS;
  await sleep(FIRST_POLL_MS);
  while (Date.now() < deadline) {
    const result = await pollGeminiImage(taskId);
    if (result.status === 'completed' && result.url) {
      // reAPI bills finished images only.
      meter.add(`Photo (${REAPI_MODELS[PHOTO_MODEL].label})`, REAPI_MODELS[PHOTO_MODEL].priceUsdMicros['1k']);
      const res = await fetch(result.url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`photo download failed (${res.status})`);
      const jpeg = await sharp(Buffer.from(await res.arrayBuffer())).resize(1080, 1350, { fit: 'cover' }).jpeg({ quality: 88 }).toBuffer();
      const key = photoKey(runId, index);
      await putObject(key, jpeg, 'image/jpeg');
      return key;
    }
    if (result.status === 'failed') throw new Error(result.error ?? 'Photo generation failed');
    await sleep(POLL_MS);
  }
  throw new Error('Photo generation timed out');
};

/**
 * Generates every photo not stored yet (a resumed run keeps the ones it has). A failed photo is recorded, not fatal;
 * the step fails only when fewer photos exist than the longest slideshow needs.
 */
export const makePhotos = async (runId: string, prompts: string[], existing: AutoPhoto[] | null, meter: CostMeter): Promise<AutoPhoto[]> => {
  const photos: AutoPhoto[] = prompts.map((prompt, i) => {
    const prior = existing?.[i];
    return prior?.imageKey && prior.prompt === prompt ? prior : { prompt, imageKey: null, error: null };
  });
  const todo = photos.map((p, i) => ({ p, i })).filter(({ p }) => !p.imageKey);
  await runPool(todo, CONCURRENCY, async ({ p, i }) => {
    try {
      photos[i] = { ...p, imageKey: await makePhoto(runId, i, p.prompt, meter), error: null };
    } catch (err) {
      photos[i] = { ...p, imageKey: null, error: clip(err instanceof Error ? err.message : String(err), 300) };
    }
  });
  return photos;
};
