// server-only — never import from a 'use client' file.
// Describes a Your Brand Content photo with a vision model (Gemini Flash Lite through OpenRouter), in the background
// after the upload answers. The description and tags are stored on the user_uploads row, to pick photos later.
// Version 2 (2026-10-10) adds what the slideshow photo plan needs (photoPlan.ts): what kind of photo it is, the exact
// product, and whether it can go on a slide as it is or only serve as a reference for the product's look.

import type { Prisma } from '@prisma/client';
import sharp from 'sharp';
import { prisma } from '../../lib/db';
import { openRouterChat, parseJsonObject } from '../ai/openrouter';

/** Cheap and fast, sees photos well; same model the asset descriptor falls back to. */
export const PHOTO_DESCRIBE_MODEL = 'google/gemini-3.1-flash-lite';

/** Bump when PROMPT changes; scripts/describe-brand-photos.ts --all re-describes older photos. */
export const DESCRIBE_VERSION = 2;

/** Longest side sent to the model: enough to read the scene, fewer image tokens than the stored 2048 px. */
const MODEL_SIDE = 1024;

// Flat top-level keys only: small models skip fields nested in an object.
const PROMPT = [
  'This photo was uploaded by a small business for its own social media posts. Describe it so we can pick it later',
  'for a TikTok or Instagram slideshow. Return JSON only, with these keys:',
  '{',
  '  "description": "1-2 plain sentences: what the photo shows (people, place, products, action)",',
  '  "tags": ["5-10 short lowercase tags: subjects, setting, objects, mood"],',
  '  "setting": "indoor" | "outdoor" | "studio" | "screen" | "other",',
  '  "has_person": true | false,',
  '  "shows_face": true | false,',
  '  "shows_product": true | false,',
  '  "mood": "one or two words",',
  '  "text_in_photo": "any readable text in the photo, or empty",',
  '  "text_safe_zone": "top" | "bottom" | "center" | "none",',
  '  "photo_type": "product_only" | "product_on_person" | "product_in_use" | "screen_ui" | "lifestyle" | "place" | "person" | "team" | "other",',
  '  "product_name": "the exact product shown, 4-12 words: kind, color, material, model (e.g. \'red high-waisted leggings and matching sports bra\'), or empty",',
  '  "looks_like_ad": true | false,',
  '  "usable_as_background": true | false,',
  '  "usable_as_reference": true | false',
  '}',
  '"text_safe_zone": the calmest area where slide text could sit without covering faces or the main subject.',
  '"photo_type": product_only = the product alone (packshot, flat lay); product_on_person = worn or held, posed;',
  'product_in_use = someone really using it; screen_ui = an app or website screen.',
  '"looks_like_ad": true for a polished advert: studio packshot, price, promo text, logo overlay, banner layout.',
  '"usable_as_background": true when it could be a TikTok slide photo as it is: sharp, real-looking, little or no text.',
  '"usable_as_reference": true when one product is clearly and fully visible, so an image model could copy its exact look.',
].join('\n');

type Described = { description: string; tags: string[]; descriptor: Record<string, unknown> };

const toDescribed = (raw: Record<string, unknown> | null): Described | null => {
  const description = typeof raw?.description === 'string' ? raw.description.trim().slice(0, 600) : '';
  if (!raw || !description) return null;
  const tags = Array.isArray(raw.tags)
    ? [...new Set(raw.tags.filter((t): t is string => typeof t === 'string').map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 12)
    : [];
  return { description, tags, descriptor: raw };
};

/** The photo as a small JPEG data URI for the model. */
const modelImage = async (jpeg: Buffer): Promise<string> => {
  const small = await sharp(jpeg).resize({ width: MODEL_SIDE, height: MODEL_SIDE, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
  return `data:image/jpeg;base64,${small.toString('base64')}`;
};

/** Describes one uploaded photo and stores the result. Never throws: a failure is stored on the row ("failed"). */
export async function describeBrandPhoto(uploadId: string, jpeg: Buffer): Promise<void> {
  try {
    const text = await openRouterChat(
      [{ role: 'user', content: [{ type: 'image_url', image_url: { url: await modelImage(jpeg) } }, { type: 'text', text: PROMPT }] }],
      { model: PHOTO_DESCRIBE_MODEL, maxTokens: 800, temperature: 0.2, timeoutMs: 45_000 },
    );
    const result = toDescribed(parseJsonObject(text));
    if (!result) throw new Error(text ? 'Reply had no description' : 'No reply from the model');
    await prisma.userUpload.update({
      where: { id: uploadId },
      data: {
        describeStatus: 'done', description: result.description, tags: result.tags,
        descriptor: { ...result.descriptor, model: PHOTO_DESCRIBE_MODEL, version: DESCRIBE_VERSION } as Prisma.InputJsonValue, describeError: null, describedAt: new Date(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[brand-content] photo description failed:', message);
    await prisma.userUpload.update({ where: { id: uploadId }, data: { describeStatus: 'failed', describeError: message.slice(0, 500) } }).catch(() => undefined);
  }
}
