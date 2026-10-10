// server-only — never import from a 'use client' file.
// 9:16 image generation via reAPI Nano Banana 2.1 (`nano-banana-2.1`, 1K).
// Used by the Blitz "Generate AI background" button and by the slideshow engines' image fallback.

import { REAPI_MODELS, type ReapiModelId } from '../../config/reapiModels';
import { pollGeminiImage, submitReapiImage } from '../../lib/reapiImage';

/** Nano Banana 2.1 at 1K ($0.03 an image), the user's pick for every generated photo since 2026-10-10 (FLUX.2 before,
 *  GPT Image 2.5 before that). The model name is stored on the generated assets. */
const MODEL: ReapiModelId = 'reapi-nano-banana-2.1';
/** 1K (user's pick 2026-10-09): 9:16 backgrounds behind captions do not need 2K. */
const HIGH_RES = false;
export const VERTICAL_IMAGE_MODEL = REAPI_MODELS[MODEL].apiModel;
const FIRST_POLL_MS = 8_000;
const POLL_MS = 3_000;
const MAX_WAIT_MS = 5 * 60_000;

export type GeneratedImage = { buffer: Buffer; contentType: string; ext: 'png' | 'jpg' | 'webp' };

export class ImageGenerationError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * reAPI allows 30 tasks in flight and 20 submissions a second per account. A Blitz batch asks for ~50 images at once,
 * so this process runs at most IN_FLIGHT and the rest wait their turn; a 429 still seen (other processes) is retried.
 */
const IN_FLIGHT = 20;
const RATE_RETRIES = 6;
let running = 0;
const queue: Array<() => void> = [];

async function withSlot<T>(job: () => Promise<T>): Promise<T> {
  if (running >= IN_FLIGHT) await new Promise<void>((resolve) => queue.push(resolve));
  running += 1;
  try {
    return await job();
  } finally {
    running -= 1;
    queue.shift()?.();
  }
}

const isRateLimit = (err: unknown) => err instanceof Error && /\b429\b|rate limit|too many/i.test(err.message);

/** Submits the task, waiting and retrying (2 s, 4 s, 8 s… plus jitter) while reAPI says 429. */
async function submitWithRetry(prompt: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    try {
      return (await submitReapiImage({ model: MODEL, prompt, imageUrls: [], ratio: '9:16', highRes: HIGH_RES })).taskId;
    } catch (err) {
      if (!isRateLimit(err) || attempt >= RATE_RETRIES) throw err;
      await sleep(Math.min(30_000, 2_000 * 2 ** attempt) + Math.random() * 1_000);
    }
  }
}

/** Polls the reAPI task until it has an image URL. */
async function waitForImage(taskId: string): Promise<string> {
  const deadline = Date.now() + MAX_WAIT_MS;
  await sleep(FIRST_POLL_MS);
  while (Date.now() < deadline) {
    const result = await pollGeminiImage(taskId);
    if (result.status === 'completed' && result.url) return result.url;
    if (result.status === 'failed') throw new ImageGenerationError(`Image generation failed: ${result.error ?? 'unknown'}`, 502);
    await sleep(POLL_MS);
  }
  throw new ImageGenerationError('Image generation timed out', 504);
}

/** Generates one vertical image. Throws ImageGenerationError (with an HTTP-ish status) on failure. */
export async function generateVerticalImage(prompt: string): Promise<GeneratedImage> {
  if (!process.env.REAPI_API_KEY) throw new ImageGenerationError('REAPI_API_KEY is not configured on the server.', 503);
  const imageUrl = await withSlot(async () => {
    let taskId: string;
    try {
      taskId = await submitWithRetry(prompt);
    } catch (err) {
      throw new ImageGenerationError(`reAPI submission failed: ${err instanceof Error ? err.message.slice(0, 200) : 'unknown'}`, 502);
    }
    return waitForImage(taskId);
  });

  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) throw new ImageGenerationError(`Failed to download generated image: ${imageRes.status}`, 502);
  const contentType = imageRes.headers.get('content-type') ?? 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'webp';
  return { buffer: Buffer.from(await imageRes.arrayBuffer()), contentType, ext };
}
