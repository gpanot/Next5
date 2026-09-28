// server-only — never import from a 'use client' file.
// Video step 2: the UGC avatar. Same locked portrait-clone JSON prompt as "New influencer" (app/brand/sets/new), which
// pins an ordinary, imperfect real person instead of AI beauty; only the outfit follows the script's persona.

import sharp from 'sharp';
import { REAPI_MODELS } from '../../../config/reapiModels';
import { pollGeminiImage, submitReapiImage } from '../../../lib/reapiImage';
import type { VideoScript } from '../../../types/admin/metaAds';
import { buildPortraitPrompt } from '../../sets/portrait';
import { putObject } from '../../storage/objectStore';
import type { CostMeter } from '../cost';

const AVATAR_MODEL = 'reapi-gpt-image-2.5' as const;
const TIMEOUT_MS = 180_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const avatarKey = (runId: string, videoId: string) => `admin/meta-ads/${runId}/videos/${videoId}-avatar.jpg`;

/** The influencer portrait prompt for this persona, with their outfit instead of the default grey t-shirt. */
export const avatarPrompt = (persona: VideoScript['persona']): string => {
  const prompt = JSON.parse(
    buildPortraitPrompt({ gender: persona.gender, age: persona.age, ethnicity: persona.ethnicity, additionalDetails: `${persona.look}; the buyer's peer, filmed for a UGC ad` }),
  ) as Record<string, unknown>;
  prompt.outfit = { top: persona.look, bottom: 'not visible', jewelry: 'none', watch: 'none', logos: 'none, plain unbranded clothing' };
  return JSON.stringify(prompt);
};

/** Generates the 9:16 avatar with GPT Image 2.5 and keeps our own copy (reAPI links expire). Returns the storage key. */
export const generateAvatar = async (prompt: string, key: string, meter: CostMeter): Promise<string> => {
  const { taskId } = await submitReapiImage({ model: AVATAR_MODEL, prompt, imageUrls: [], ratio: '9:16', highRes: false });
  const deadline = Date.now() + TIMEOUT_MS;
  await sleep(8_000);
  while (Date.now() < deadline) {
    const result = await pollGeminiImage(taskId);
    if (result.status === 'completed' && result.url) {
      meter.add(`Avatar (${REAPI_MODELS[AVATAR_MODEL].label})`, REAPI_MODELS[AVATAR_MODEL].priceUsdMicros['1k']);
      const res = await fetch(result.url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`Could not download the avatar (${res.status})`);
      await putObject(key, await sharp(Buffer.from(await res.arrayBuffer())).jpeg({ quality: 90 }).toBuffer(), 'image/jpeg');
      return key;
    }
    if (result.status === 'failed') throw new Error(result.error ?? 'Avatar generation failed');
    await sleep(3_000);
  }
  throw new Error('Avatar generation timed out');
};
