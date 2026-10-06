// server-only — never import from a 'use client' file.
// Describes a Your Brand Content photo with a vision model (Gemini Flash Lite through OpenRouter), in the background
// after the upload answers. The description and tags are stored on the user_uploads row, to pick photos later.

import type { Prisma } from '@prisma/client';
import sharp from 'sharp';
import { prisma } from '../../lib/db';
import { openRouterChat, parseJsonObject } from '../ai/openrouter';

/** Cheap and fast, sees photos well; same model the asset descriptor falls back to. */
export const PHOTO_DESCRIBE_MODEL = 'google/gemini-3.1-flash-lite';

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
  '  "text_safe_zone": "top" | "bottom" | "center" | "none"',
  '}',
  '"text_safe_zone": the calmest area where slide text could sit without covering faces or the main subject.',
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
        descriptor: { ...result.descriptor, model: PHOTO_DESCRIBE_MODEL } as Prisma.InputJsonValue, describeError: null, describedAt: new Date(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[brand-content] photo description failed:', message);
    await prisma.userUpload.update({ where: { id: uploadId }, data: { describeStatus: 'failed', describeError: message.slice(0, 500) } }).catch(() => undefined);
  }
}
