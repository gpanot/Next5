// server-only — never import from a 'use client' file.
// Generates a portrait image for a new influencer via Nano Banana 2 text-to-image,
// polls until done, stores the result in R2, and returns a presigned URL.

import { putObject, presignObject } from '../storage/objectStore';
import { submitGenerate, pollTask, isTerminal } from '../../lib/wavespeed';

const POLL_INTERVAL_MS = 2_000;
const MAX_POLLS = 90; // 3 minutes maximum

/** R2 key for a generated influencer portrait. */
export const portraitKey = (influencerId: string): string =>
  `influencers/${influencerId}/portrait.jpg`;

/** R2 key for a temporary preview portrait (before the Influencer record is saved). */
export const portraitPreviewKey = (tempId: string): string =>
  `influencers/previews/${tempId}.jpg`;

export type GeneratePortraitResult = {
  /** R2 key where the image was stored. */
  r2Key: string;
  /** Short-lived presigned URL for the client to display. */
  url: string;
};

/**
 * Builds a portrait prompt from the traits the user described.
 * The prompt is designed to produce a clean, well-lit headshot suitable as a base portrait.
 */
export const buildPortraitPrompt = ({
  gender,
  age,
  ethnicity,
  additionalDetails,
}: {
  gender?: string | null;
  age?: number | null;
  ethnicity?: string | null;
  additionalDetails?: string | null;
}): string => {
  const parts: string[] = [
    'Professional portrait photo, studio lighting, clean background.',
    'Sharp focus on face, photorealistic, high quality.',
  ];
  if (gender) parts.push(`${gender}.`);
  if (age) parts.push(`Approximately ${age} years old.`);
  if (ethnicity) parts.push(`${ethnicity} ethnicity.`);
  if (additionalDetails?.trim()) parts.push(additionalDetails.trim());
  parts.push('Looking directly at the camera. Natural expression. No text or watermarks.');
  return parts.join(' ');
};

/**
 * Submits a portrait generation task, polls until it completes,
 * downloads the result, stores it in R2 under `r2Key`, and returns a presigned URL.
 *
 * @param r2Key - Where to store the generated image in R2.
 * @param prompt - The fully-built text prompt.
 */
export const generateAndStorePortrait = async (
  r2Key: string,
  prompt: string,
): Promise<GeneratePortraitResult> => {
  const taskId = await submitGenerate({ prompt, aspectRatio: '3:4', resolution: '1k' });

  let polls = 0;
  let imageUrl: string | null = null;
  while (polls < MAX_POLLS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const result = await pollTask(taskId);
    if (isTerminal(result.status)) {
      if (result.status === 'completed' && result.url) {
        imageUrl = result.url;
        break;
      }
      throw new Error(`Portrait generation failed: ${result.error ?? result.status}`);
    }
    polls += 1;
  }
  if (!imageUrl) throw new Error('Portrait generation timed out.');

  // Download from WaveSpeed CDN and store in our R2.
  const fetchRes = await fetch(imageUrl);
  if (!fetchRes.ok) throw new Error(`Could not download generated portrait (${fetchRes.status})`);
  const buffer = Buffer.from(await fetchRes.arrayBuffer());
  await putObject(r2Key, buffer, 'image/jpeg');

  const url = (await presignObject(r2Key)) ?? '';
  return { r2Key, url };
};
