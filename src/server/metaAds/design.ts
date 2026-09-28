// server-only — never import from a 'use client' file.
// Steps 5 + 6 per ad: GPT Image 2.5 on reAPI, then composite and store.
// Each ad moves on to compositing as soon as its own image lands, so the grid fills in as it goes.

import type { MetaAd } from '@prisma/client';
import type { BrandProfile } from '../../types/admin/metaAds';
import { prisma } from '../../lib/db';
import { pollGeminiImage, submitReapiImage } from '../../lib/reapiImage';
import { putObject } from '../storage/objectStore';
import { compositeAd } from './composite';
import type { CostMeter } from './cost';
import { placeText } from './placement';
import { REAPI_MODELS } from '../../config/reapiModels';
import { clip } from './text';

/** GPT Image 2.5 on reAPI. Its 1K size for 4:5 (1216×1536) already covers the 1080×1350 ad. */
export const IMAGE_MODEL = 'reapi-gpt-image-2.5' as const;
const HIGH_RES = false;
export const IMAGE_MODEL_LABEL = 'GPT Image 2.5';
const FIRST_POLL_MS = 8_000;
const POLL_MS = 3_000;
const IMAGE_TIMEOUT_MS = 240_000;
const DEFAULT_ACCENT = '#F6E05E';

export const metaAdKey = (runId: string, adId: string): string => `admin/meta-ads/${runId}/${adId}.jpg`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A dark brand color under dark caption text is unreadable, so only light brand colors qualify. */
const captionAccent = (palette: string[]): string => {
  const light = palette.find((hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6;
  });
  return light ?? DEFAULT_ACCENT;
};

/** reAPI allows 10 tasks in flight per account; a regenerate or another run can still collide with a batch. */
const SUBMIT_ATTEMPTS = 4;
const BUSY_WAIT_MS = 15_000;

/** Submits one image, waiting and retrying while reAPI answers 429 (too many tasks in flight). */
const submitWithRetry = async (prompt: string) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await submitReapiImage({ model: IMAGE_MODEL, prompt, imageUrls: [], ratio: '4:5', highRes: HIGH_RES });
    } catch (err) {
      const busy = err instanceof Error && err.message.includes('(429)');
      if (!busy || attempt >= SUBMIT_ATTEMPTS) throw err;
      console.warn(`[meta-ads] reAPI busy (429), retry ${attempt}/${SUBMIT_ATTEMPTS - 1} in ${(BUSY_WAIT_MS * attempt) / 1000}s`);
      await sleep(BUSY_WAIT_MS * attempt);
    }
  }
};

const generateImage = async (prompt: string, meter: CostMeter): Promise<string> => {
  const { taskId } = await submitWithRetry(prompt);
  const deadline = Date.now() + IMAGE_TIMEOUT_MS;
  await sleep(FIRST_POLL_MS);
  while (Date.now() < deadline) {
    const result = await pollGeminiImage(taskId);
    if (result.status === 'completed' && result.url) {
      // reAPI bills finished images only; failed and moderated tasks are free.
      meter.add(`Image (${IMAGE_MODEL_LABEL}${HIGH_RES ? ', 2K' : ''})`, REAPI_MODELS[IMAGE_MODEL].priceUsdMicros[HIGH_RES ? '2k' : '1k']);
      return result.url;
    }
    if (result.status === 'failed') throw new Error(result.error ?? 'Image generation failed');
    await sleep(POLL_MS);
  }
  throw new Error('Image generation timed out');
};

/** Runs step 5 (unless the ad already has an image) then step 6 for one ad. Never throws: failures land on the ad row. */
export const designAd = async (ad: MetaAd, profile: BrandProfile, meter: CostMeter, only: 'both' | 'composite' = 'both'): Promise<void> => {
  try {
    let imageUrl = ad.rawImageUrl;
    if (only === 'both' || !imageUrl) {
      await prisma.metaAd.update({ where: { id: ad.id }, data: { status: 'imaging', error: null } });
      imageUrl = await generateImage(ad.imagePrompt, meter);
      await prisma.metaAd.update({ where: { id: ad.id }, data: { rawImageUrl: imageUrl } });
    }
    await prisma.metaAd.update({ where: { id: ad.id }, data: { status: 'compositing', error: null } });
    const jpeg = await compositeAd({
      imageUrl,
      overlayText: ad.overlayText,
      brandName: profile.brandName,
      style: ad.style,
      accent: captionAccent(profile.palette),
      placement: await placeText(imageUrl, ad.style, meter),
    });
    const key = metaAdKey(ad.runId, ad.id);
    await putObject(key, jpeg, 'image/jpeg');
    await prisma.metaAd.update({ where: { id: ad.id }, data: { finalAssetKey: key, status: 'ready' } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[meta-ads] ad ${ad.id} failed:`, message);
    await prisma.metaAd.update({ where: { id: ad.id }, data: { status: 'failed', error: clip(message, 500) } });
  }
};
