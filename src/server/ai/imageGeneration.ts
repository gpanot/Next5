// server-only — never import from a 'use client' file.
// 9:16 image generation via reAPI GPT Image 2.5 (`gpt-image-2.5-flare`), the model the Auto Slideshow photos use.
// Used by the Blitz "Generate AI background" button and by the slideshow engines' image fallback.

import type { ReapiModelId } from '../../config/reapiModels';
import { pollGeminiImage, submitReapiImage } from '../../lib/reapiImage';

/** GPT Image 2.5: more natural people and scenes than Nano Banana 2 Lite, $0.023 flat at 2K (1152x2048 for 9:16). */
const MODEL: ReapiModelId = 'reapi-gpt-image-2.5';
const FIRST_POLL_MS = 8_000;
const POLL_MS = 3_000;
const MAX_WAIT_MS = 5 * 60_000;

export type GeneratedImage = { buffer: Buffer; contentType: string; ext: 'png' | 'jpg' | 'webp' };

export class ImageGenerationError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

  let taskId: string;
  try {
    ({ taskId } = await submitReapiImage({ model: MODEL, prompt, imageUrls: [], ratio: '9:16', highRes: true }));
  } catch (err) {
    throw new ImageGenerationError(`reAPI submission failed: ${err instanceof Error ? err.message.slice(0, 200) : 'unknown'}`, 502);
  }
  const imageUrl = await waitForImage(taskId);

  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) throw new ImageGenerationError(`Failed to download generated image: ${imageRes.status}`, 502);
  const contentType = imageRes.headers.get('content-type') ?? 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'webp';
  return { buffer: Buffer.from(await imageRes.arrayBuffer()), contentType, ext };
}
