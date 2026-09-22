// server-only — never import from a 'use client' file.
// Generates a portrait image for a new influencer via Gemini 3 Pro Image (reAPI) text-to-image,
// polls until done, stores the result in R2, and returns a presigned URL.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { isMockGeneration } from '../../lib/mock';
import { putObject, presignObject } from '../storage/objectStore';
import sharp from 'sharp';
import { generateGeminiImage } from '../../lib/reapiImage';
import { BASE_PORTRAIT_SHOT } from '../../content/business/catalog/influencerShots';
import { mockSampleImage } from '../generation/labeling';
import { composeLockedPrompt, type IdentityLock } from '../generation/composer/portraitClone';

/** Mock mode: a stock face from public/, so the rest of the flow shows a real-looking person at zero cost. */
const mockPortrait = async (): Promise<Buffer> =>
  readFile(/*turbopackIgnore: true*/ path.join(process.cwd(), 'public', 'images', 'business', 'us', 'ai-avatars', 'avatar-1-ashley.jpg'))
    .catch(() => mockSampleImage('Portrait', '3:4'));

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

type PortraitTraits = {
  gender?: string | null;
  age?: number | null;
  ethnicity?: string | null;
  additionalDetails?: string | null;
};

/** A text-only lock: the traits the user gave, everything else pinned to an ordinary, real-looking person. */
const traitsIdentity = ({ gender, age, ethnicity, additionalDetails }: PortraitTraits): IdentityLock => ({
  subject: {
    count: 1,
    gender: gender || 'woman',
    appearance: ethnicity || 'not specified — choose one and keep it consistent',
    apparent_age: age ? `${age}` : '34',
    attractiveness_level: 'ordinary real person, pleasant and approachable, not a model',
    ...(additionalDetails ? { user_description: additionalDetails } : {}),
  },
  face: {
    asymmetry: 'left eye 1 mm smaller than the right, mouth corner 1 mm higher on the right',
    skin: { texture: 'visible pores on nose and cheeks, faint fine lines at the outer eye corners matching the age', color_variation: 'slight redness at the nostrils and chin', moles: '1 small flat mole 1.5 cm below the left cheekbone' },
  },
  hair: { imperfections: '5 flyaway strands at the crown, slight clumping at the ends', shine: 'low, matte' },
  critical_constraints: ['LOOK: an ordinary real person photographed as is, not an idol, model or influencer glamour face'],
  negative_prompt: ['beauty filter, glamour makeup, model face, perfect features'],
});

/** Locked JSON prompt (portrait-clone) for the base face, from the traits the user described. */
export const buildPortraitPrompt = (traits: PortraitTraits): string =>
  composeLockedPrompt({ id: 'influencer_base_portrait', identity: traitsIdentity(traits), shot: BASE_PORTRAIT_SHOT, withReference: false });

/**
 * Generates the portrait with Gemini 3 Pro Image (reAPI, 9:16), waits for it,
 * stores it in R2 under `r2Key`, and returns a presigned URL.
 */
export const generateAndStorePortrait = async (
  r2Key: string,
  prompt: string,
): Promise<GeneratePortraitResult> => {
  if (isMockGeneration()) {
    await putObject(r2Key, await mockPortrait());
    return { r2Key, url: (await presignObject(r2Key)) ?? '' };
  }
  const imageUrl = await generateGeminiImage({ prompt, ratio: '9:16', resolution: '1K' });

  // Download from the reAPI CDN (links last 7 days) and keep our own copy.
  const fetchRes = await fetch(imageUrl);
  if (!fetchRes.ok) throw new Error(`Could not download generated portrait (${fetchRes.status})`);
  const buffer = await sharp(Buffer.from(await fetchRes.arrayBuffer())).jpeg({ quality: 90 }).toBuffer();
  await putObject(r2Key, buffer, 'image/jpeg');

  const url = (await presignObject(r2Key)) ?? '';
  return { r2Key, url };
};
