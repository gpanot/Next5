// server-only — never import from a 'use client' file.
// Step 5: the run's photos, on reAPI (model in PHOTO_GEN, cropped to 4:5). Each photo is copied to the object store right
// away: reAPI result links expire, and step 6 renders from our copy. Each photo keeps how it was made (`gen`) for replays.

import { REAPI_MODELS, type ReapiModelId } from '../../config/reapiModels';
import { pollGeminiImage, submitReapiImage, type ReapiRatio } from '../../lib/reapiImage';
import type { AutoPhoto, HeadBox, PhotoGen } from '../../types/admin/autoSlideshow';
import type { CostMeter } from '../metaAds/cost';
import { clip } from '../metaAds/text';
import { runPool } from '../pool';
import { putObject } from '../storage/objectStore';
import { detectHeads } from './heads';
import { compressJpeg, PHOTO_SIZE } from './jpeg';

export type PhotoGenConfig = { model: ReapiModelId; ratio: ReapiRatio; highRes: boolean };
/**
 * FLUX.2 at 2K ($0.039 a photo, about 90 s), the user's pick for every generated photo since 2026-10-09. FLUX.2 has no
 * 4:5, so it is asked 3:4 and compressJpeg crops it to 4:5. Before: GPT Image 2.5 at native 4:5 ($0.023), which beat
 * Grok Imagine 2 on the same 10 scenes (A/B test 2026-10-02). Back to it: model 'reapi-gpt-image-2.5', '4:5', true.
 */
export const PHOTO_GEN: PhotoGenConfig = { model: 'reapi-flux-2', ratio: '3:4', highRes: true };
/** reAPI allows 10 tasks in flight per account; 5 leaves room for Perfect Ads and retries. */
const CONCURRENCY = 5;
const FIRST_POLL_MS = 8_000;
const POLL_MS = 3_000;
const TIMEOUT_MS = 180_000;
const SUBMIT_ATTEMPTS = 4;
const BUSY_WAIT_MS = 15_000;

// Keep this bright. "Cinematic light" made GPT Image 2 return dark, moody photos (mean luma 85-140 of 255); this wording
// gave 164-173 on the same scenes (A/B test 2026-09-29). White slide text still reads thanks to its outline.
// No framing rule: "heads below the middle, upper 40% empty" bent scenes (roofless cars, sky inside rooms) and heads still
// landed in the text zone 9 times in 10, so the text moves off heads instead (A/B test 2026-10-02).
// No brand ban: "no logos, no phone screens" made people hold phones flipped and hid the brand. Logos and brand names may
// show. Only stray text is kept out, so it never fights the slide text.
const STYLE = 'Bright, airy, well-exposed photograph in daylight, high-key, true-to-life colors, clean and inviting, realistic candid photo with natural proportions, vertical framing. No text overlays, no watermarks.';
/** Bump when STYLE changes, so each photo's record says which wording made it. */
export const STYLE_VERSION = '2026-10-02b';

/** The full text the photo model gets: the scene, the brand's look, then the shared style. */
export const photoPrompt = (scene: string, look?: string): string => [scene, look && `Brand look: ${look}`, STYLE].filter(Boolean).join(' ');

export const photoKey = (runId: string, index: number) => `admin/auto-slideshow/${runId}/photos/${index}.jpg`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const submit = async (prompt: string, gen: PhotoGenConfig) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await submitReapiImage({ model: gen.model, prompt, imageUrls: [], ratio: gen.ratio, highRes: gen.highRes });
    } catch (err) {
      const busy = err instanceof Error && err.message.includes('(429)');
      if (!busy || attempt >= SUBMIT_ATTEMPTS) throw err;
      await sleep(BUSY_WAIT_MS * attempt);
    }
  }
};

type MadePhoto = { key: string; heads: HeadBox[] | null; gen: PhotoGen };

/** One photo, generated and stored as a 1440x1800 JPEG under 1 MB, with its heads found so step 6 keeps text off them. */
const makePhoto = async (runId: string, index: number, scene: string, look: string | undefined, meter: CostMeter, config: PhotoGenConfig = PHOTO_GEN): Promise<MadePhoto> => {
  const sentPrompt = photoPrompt(scene, look);
  const { taskId, cost } = await submit(sentPrompt, config);
  const gen: PhotoGen = { sentPrompt, model: config.model, ratio: config.ratio, highRes: config.highRes, taskId, styleVersion: STYLE_VERSION, createdAt: new Date().toISOString() };
  const deadline = Date.now() + TIMEOUT_MS;
  await sleep(FIRST_POLL_MS);
  while (Date.now() < deadline) {
    const result = await pollGeminiImage(taskId);
    if (result.status === 'completed' && result.url) {
      // reAPI bills finished images only.
      meter.add(`Photo (${REAPI_MODELS[config.model].label})`, cost);
      const res = await fetch(result.url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`photo download failed (${res.status})`);
      const jpeg = await compressJpeg(Buffer.from(await res.arrayBuffer()), PHOTO_SIZE);
      const key = photoKey(runId, index);
      await putObject(key, jpeg, 'image/jpeg');
      return { key, gen, heads: await detectHeads(`data:image/jpeg;base64,${jpeg.toString('base64')}`) };
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
      const { key, heads, gen } = await makePhoto(runId, i, p.prompt, options.look, meter);
      // Unknown heads (detection failed) stay unset, so step 6 tries again.
      photos[i] = { ...p, imageKey: key, error: null, gen, ...(heads ? { heads } : {}) };
    } catch (err) {
      photos[i] = { ...p, imageKey: null, error: clip(err instanceof Error ? err.message : String(err), 300) };
    }
  });
  return photos;
};
