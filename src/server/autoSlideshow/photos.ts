// server-only — never import from a 'use client' file.
// Step 5: the run's photos, 9:16 like the slides, from the photo engine in photoRules.ts (GPT Image 2.5 on reAPI, then
// WaveSpeed, since 2026-10-21). Each photo is copied to the object store right away: result links expire, and step 6 renders
// from our copy. Each photo keeps how it was made (`gen`) for replays.

import { IMAGE_MODELS, type ImageModelId } from '../../config/imageModels';
import { REAPI_MODELS, type ReapiModelId } from '../../config/reapiModels';
import { costUsdMicros, submitEdit, waitForTask } from '../../lib/wavespeed';
import { pollGeminiImage, submitReapiImage, type ReapiRatio } from '../../lib/reapiImage';
import type { AutoPhoto, HeadBox, PhotoGen } from '../../types/admin/autoSlideshow';
import type { CostMeter } from '../metaAds/cost';
import { clip } from '../metaAds/text';
import { runPool } from '../pool';
import { getObject, presignObject, putObject } from '../storage/objectStore';
import { detectHeads } from './heads';
import { PHOTO_STYLE_RULES, PHOTO_STYLE_VERSION, photoEngine, type PhotoEngineStep } from './photoRules';
import { compressJpeg, PHOTO_SIZE } from './jpeg';

export type PhotoGenConfig = { model: ReapiModelId; ratio: ReapiRatio; highRes: boolean };
/**
 * Nano Banana 2.1 at native 9:16 ($0.03 a photo; 4:5 until 2026-10-10), the user's pick for every generated photo since 2026-10-10:
 * it keeps the brand cast's face and the brand's real product the same from reference images. Before: FLUX.2 at 1K
 * ($0.028, asked 3:4 and cropped; back to it: 'reapi-flux-2', '3:4', false), and GPT Image 2.5 before that.
 */
export const PHOTO_GEN: PhotoGenConfig = { model: 'reapi-nano-banana-2.1', ratio: '9:16', highRes: false };
/** reAPI allows 10 tasks in flight per account. A slideshow needs 5-9 photos: at 5 they came in two waves (~80 s instead
 *  of ~40 s, run timings 2026-10-10). A busy reply (429) waits and retries, so a burst from other features only slows. */
const CONCURRENCY = 10;
const FIRST_POLL_MS = 8_000;
const POLL_MS = 3_000;
const TIMEOUT_MS = 180_000;
const SUBMIT_ATTEMPTS = 4;
const BUSY_WAIT_MS = 15_000;

// The shared style lives in photoRules.ts with its A/B history, so it can be tweaked step by step.
const STYLE = PHOTO_STYLE_RULES.join(' ');
/** Which wording made each photo (stored in its record). */
export const STYLE_VERSION = PHOTO_STYLE_VERSION;

/** The full text the photo model gets: the scene, the brand's look, the shared style, then what the reference images are. */
export const photoPrompt = (scene: string, look?: string, refNote?: string): string => [scene, look && `Brand look: ${look}`, STYLE, refNote].filter(Boolean).join(' ');

export const photoKey = (runId: string, index: number) => `admin/auto-slideshow/${runId}/photos/${index}.jpg`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const submit = async (prompt: string, imageUrls: string[], gen: PhotoGenConfig) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await submitReapiImage({ model: gen.model, prompt, imageUrls, ratio: gen.ratio, highRes: gen.highRes });
    } catch (err) {
      const busy = err instanceof Error && err.message.includes('(429)');
      if (!busy || attempt >= SUBMIT_ATTEMPTS) throw err;
      await sleep(BUSY_WAIT_MS * attempt);
    }
  }
};

/** One image from reAPI as raw bytes, with how it was asked. `refUrls`: public HTTPS reference images (the cast member
 *  first, then the product). Billed on `meter` only when it finished (reAPI bills finished images only). */
export const generatePhoto = async (prompt: string, refUrls: string[], meter: CostMeter, config: PhotoGenConfig = PHOTO_GEN): Promise<{ buffer: Buffer; taskId: string }> => {
  const { taskId, cost } = await submit(prompt, refUrls, config);
  const deadline = Date.now() + TIMEOUT_MS;
  await sleep(FIRST_POLL_MS);
  while (Date.now() < deadline) {
    const result = await pollGeminiImage(taskId);
    if (result.status === 'completed' && result.url) {
      meter.add(`Photo (${REAPI_MODELS[config.model].label})`, cost);
      const res = await fetch(result.url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`photo download failed (${res.status})`);
      return { buffer: Buffer.from(await res.arrayBuffer()), taskId };
    }
    if (result.status === 'failed') throw new Error(result.error ?? 'Photo generation failed');
    await sleep(POLL_MS);
  }
  throw new Error('Photo generation timed out');
};

type Made = { buffer: Buffer; taskId: string; model: string };

/** GPT Image 2.5 Flare on WaveSpeed: the edit model with reference images, text-to-image without. */
const wavespeedPhoto = async (prompt: string, refUrls: string[], meter: CostMeter): Promise<Made> => {
  const model: ImageModelId = refUrls.length ? 'gpt-image-2.5-flare' : 'gpt-image-2.5-flare-t2i';
  const taskId = await submitEdit({ model, prompt, imageUrls: refUrls, aspectRatio: PHOTO_GEN.ratio, resolution: '1k' });
  const url = await waitForTask(taskId, { timeoutMs: TIMEOUT_MS });
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`photo download failed (${res.status})`);
  meter.add(`Photo (${IMAGE_MODELS[model].label}, WaveSpeed)`, costUsdMicros(model, '1k', refUrls.length));
  return { buffer: Buffer.from(await res.arrayBuffer()), taskId, model: `wavespeed-${model}` };
};

const onReapi = (model: ReapiModelId) => async (prompt: string, refUrls: string[], meter: CostMeter): Promise<Made> => ({ ...(await generatePhoto(prompt, refUrls, meter, { ...PHOTO_GEN, model })), model });

const ENGINE_STEPS: Record<PhotoEngineStep, (prompt: string, refUrls: string[], meter: CostMeter) => Promise<Made>> = {
  'wavespeed-gpt-2.5': wavespeedPhoto,
  'reapi-gpt-2.5': onReapi('reapi-gpt-image-2.5'),
  'reapi-nano-2.1': onReapi(PHOTO_GEN.model),
};

/** A step that failed this many times in a row (a provider outage) is skipped for a while, so each photo does not wait
 *  on it first (reAPI's GPT failed every call for hours on 2026-10-21). Kept per server instance. */
const BREAKER_FAILURES = 3;
const BREAKER_MS = 10 * 60_000;
const breaker = new Map<PhotoEngineStep, { failures: number; until: number }>();
const isOpen = (step: PhotoEngineStep) => (breaker.get(step)?.until ?? 0) > Date.now();
const noteResult = (step: PhotoEngineStep, ok: boolean) => {
  const failures = ok ? 0 : (breaker.get(step)?.failures ?? 0) + 1;
  breaker.set(step, { failures, until: failures >= BREAKER_FAILURES ? Date.now() + BREAKER_MS : 0 });
};

/** A slideshow photo from the engine in use (photoRules.ts): each model in turn until one makes it (a refusal by a
 *  safety filter, a provider outage). The last step always runs, even when its breaker is open. Fails with every step's reason. */
export const slideshowPhoto = async (prompt: string, refUrls: string[], meter: CostMeter): Promise<Made> => {
  const steps = photoEngine();
  const errors: string[] = [];
  for (const [i, step] of steps.entries()) {
    if (isOpen(step) && i < steps.length - 1) continue;
    try {
      const made = await ENGINE_STEPS[step](prompt, refUrls, meter);
      noteResult(step, true);
      return made;
    } catch (err) {
      noteResult(step, false);
      errors.push(`${step}: ${err instanceof Error ? err.message.slice(0, 120) : String(err)}`);
    }
  }
  throw new Error(errors.join(' | '));
};

/** What one photo is made from: the scene, plus (photo plan, photoPlan.ts) its reference images or a brand photo used as it is. */
export type PhotoSpec = Pick<AutoPhoto, 'prompt' | 'refs' | 'refNote' | 'brandPhotoKey'>;

/** Public links for stored reference images; a key that cannot be linked (local storage) is left out. */
const refLinks = async (keys: string[] | undefined): Promise<string[]> => {
  const urls = await Promise.all((keys ?? []).map((k) => presignObject(k, 60 * 60).catch(() => null)));
  return urls.filter((u): u is string => Boolean(u?.startsWith('https://')));
};

/** `heads`: still being found when the photo is stored, so the next photo can start meanwhile. */
type MadePhoto = { key: string; heads: Promise<HeadBox[] | null>; gen: PhotoGen };

const storePhoto = async (runId: string, index: number, image: Buffer): Promise<{ key: string; heads: Promise<HeadBox[] | null> }> => {
  const jpeg = await compressJpeg(image, PHOTO_SIZE);
  const key = photoKey(runId, index);
  await putObject(key, jpeg, 'image/jpeg');
  return { key, heads: detectHeads(`data:image/jpeg;base64,${jpeg.toString('base64')}`) };
};

/** One photo, generated (or a brand photo copied) and stored as a 1440x1800 JPEG under 1 MB, with its heads being found
 *  so step 6 keeps text off them. */
const makePhoto = async (runId: string, index: number, spec: PhotoSpec, look: string | undefined, meter: CostMeter): Promise<MadePhoto> => {
  const createdAt = new Date().toISOString();
  if (spec.brandPhotoKey) {
    const original = await getObject(spec.brandPhotoKey);
    if (!original) throw new Error('The brand photo is no longer in storage');
    const gen: PhotoGen = { sentPrompt: '(the brand\'s own photo, used as it is)', model: 'brand-photo', ratio: '9:16', highRes: false, taskId: '', styleVersion: STYLE_VERSION, createdAt };
    return { ...(await storePhoto(runId, index, original)), gen };
  }
  const refUrls = await refLinks(spec.refs);
  const sentPrompt = photoPrompt(spec.prompt, look, refUrls.length > 0 ? spec.refNote : undefined);
  const { buffer, taskId, model } = await slideshowPhoto(sentPrompt, refUrls, meter);
  const gen: PhotoGen = { sentPrompt, model, ratio: PHOTO_GEN.ratio, highRes: PHOTO_GEN.highRes, taskId, styleVersion: STYLE_VERSION, createdAt, ...(refUrls.length ? { refs: refUrls.length } : {}) };
  return { ...(await storePhoto(runId, index, buffer)), gen };
};

/** `deadline`: no new photo starts after it (the rest stay untried for the next invocation). `skipFailed`: a continued
 *  pass leaves photos that already failed, so retries do not eat its time. `look`: the brand's photo style, added to
 *  every prompt (banks built before the style existed get it this way too). */
export type MakePhotosOptions = { deadline?: number; skipFailed?: boolean; look?: string };

/**
 * Generates every photo not stored yet (a resumed run keeps the ones it has). A failed photo is recorded, not fatal;
 * the step fails only when fewer photos exist than the longest slideshow needs.
 */
export const makePhotos = async (runId: string, specs: (string | PhotoSpec)[], existing: AutoPhoto[] | null, meter: CostMeter, options: MakePhotosOptions = {}): Promise<AutoPhoto[]> => {
  const photos: AutoPhoto[] = specs.map((s, i) => {
    const spec = typeof s === 'string' ? { prompt: s } : s;
    const extra = { ...(spec.refs?.length ? { refs: spec.refs, refNote: spec.refNote } : {}), ...(spec.brandPhotoKey ? { brandPhotoKey: spec.brandPhotoKey } : {}) };
    const prior = existing?.[i];
    if (prior?.prompt !== spec.prompt) return { prompt: spec.prompt, imageKey: null, error: null, ...extra };
    if (prior.imageKey || prior.deleted || (options.skipFailed && prior.error)) return prior;
    const { kind, owner, altFor } = prior;
    return { prompt: spec.prompt, imageKey: null, error: null, ...(kind ? { kind } : {}), ...(owner ? { owner } : {}), ...(altFor ? { altFor } : {}), ...extra };
  });
  const todo = photos.map((p, i) => ({ p, i })).filter(({ p }) => !p.imageKey && !p.deleted && !p.error);
  // Head detection (a vision call) runs outside the pool: a slot frees as soon as its photo is stored.
  const finding: Promise<void>[] = [];
  await runPool(todo, CONCURRENCY, async ({ p, i }) => {
    if (options.deadline && Date.now() > options.deadline) return;
    try {
      const { key, heads, gen } = await makePhoto(runId, i, p, options.look, meter);
      photos[i] = { ...p, imageKey: key, error: null, gen };
      // Unknown heads (detection failed) stay unset, so step 6 tries again.
      finding.push(heads.then((found) => { if (found) photos[i] = { ...photos[i]!, heads: found }; }));
    } catch (err) {
      photos[i] = { ...p, imageKey: null, error: clip(err instanceof Error ? err.message : String(err), 300) };
    }
  });
  await Promise.all(finding);
  return photos;
};
