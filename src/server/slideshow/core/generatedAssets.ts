// server-only — never import from a 'use client' file.
//
// AI image fallback for story shots. When the library has no clip in the audience's industry
// that matches the shot well enough, a 9:16 image is made from the shot's photo prompt (written
// with its story and the brand's look: shotPhotos.ts) and saved as a normal library asset:
// categories on the descriptor and the tags, a description, slot scores for its role, and an
// embedding. The next deck for the same industry finds it by search — the library grows where it was thin.

import { randomUUID } from 'node:crypto';
import { prisma } from '../../../lib/db';
import { uploadToR2 } from '../../../lib/r2';
import { REAPI_MODELS, type ReapiModelId } from '../../../config/reapiModels';
import { VERTICAL_IMAGE_MODEL, generateVerticalImage } from '../../ai/imageGeneration';
import { photoPrompt } from '../../autoSlideshow/photos';
import { blitzKeys } from '../../admin/blitzStore';
import { embedDescriptorRows } from '../../labs/assetDescriptor/embedding';
import { categoryLabel } from './categories';
import type { LibraryAsset } from './library';
import { writeShotPhotos, type PhotoBrand, type PhotoStory, type ShotPhoto } from './shotPhotos';

export type ImageNeed = {
  /** Stable key back to the shot, e.g. "electricians:pain". */
  key: string;
  /** 'hook' and 'cta': only on all-image cards (free batches, websiteMedia `allImages`). */
  role: 'hook' | 'pain' | 'oldWay' | 'mechanism' | 'proof' | 'inaction' | 'cta';
  text: string;
  /** The shot's photo prompt, written with its story (bank stories); absent = written here. */
  photo?: ShotPhoto;
  /** The story the shot belongs to, so prompts written here share its character and place. */
  story?: { id: string; lines: string; label: string; intent?: string };
  /** Lower renders first: the card's place in its batch (imageNeeds.ts groupNeeds). */
  priority?: number;
};

type ImagePlan = { key: string; prompt: string; description: string };

/** Slot scores for a generated image, by the role it was made for. */
const SLOTS: Record<ImageNeed['role'], { hook: number; problem: number; proof: number; payoff: number; cta: number }> = {
  hook:      { hook: 0.8, problem: 0.4, proof: 0.1, payoff: 0.1, cta: 0.1 },
  pain:      { hook: 0.3, problem: 0.85, proof: 0.1, payoff: 0.1, cta: 0.1 },
  oldWay:    { hook: 0.2, problem: 0.8, proof: 0.1, payoff: 0.15, cta: 0.1 },
  mechanism: { hook: 0.2, problem: 0.1, proof: 0.4, payoff: 0.85, cta: 0.3 },
  proof:     { hook: 0.2, problem: 0.1, proof: 0.85, payoff: 0.6, cta: 0.3 },
  inaction:  { hook: 0.2, problem: 0.75, proof: 0.1, payoff: 0.1, cta: 0.1 },
  cta:       { hook: 0.2, problem: 0.1, proof: 0.3, payoff: 0.5, cta: 0.85 },
};

/** Stories per prompt-writing call, calls in parallel: one call for 4 stories took ~40 s, one story ~16 s (2026-10-20). */
const STORIES_PER_CALL = 1;

/** A stored prompt still fits: written for the same people (target client) as now. */
const fits = (photo: ShotPhoto | undefined, brand: PhotoBrand): photo is ShotPhoto =>
  Boolean(photo) && (photo!.people ?? null) === (brand.people ?? null);

/** The needs' prompts: their own when written with the story for these people, else written here, grouped by story. */
async function planImages(audience: string, categories: string[], needs: ImageNeed[], brand: PhotoBrand): Promise<ImagePlan[]> {
  const missing = needs.filter((n) => !fits(n.photo, brand));
  const stories = new Map<string, PhotoStory>();
  missing.forEach((n) => {
    const id = n.story?.id ?? n.key;
    const story = stories.get(id) ?? { id, lines: n.story?.lines ?? n.text, shots: [] };
    story.shots.push({ id: n.key, role: n.role, label: n.story?.label ?? n.role, text: n.text, intent: n.story?.intent });
    stories.set(id, story);
  });
  const all = [...stories.values()];
  const chunks = Array.from({ length: Math.ceil(all.length / STORIES_PER_CALL) }, (_, i) => all.slice(i * STORIES_PER_CALL, (i + 1) * STORIES_PER_CALL));
  const written = new Map((await Promise.all(chunks.map((c) => writeShotPhotos(brand, audience, categories, c)))).flatMap((m) => [...m]));
  return needs.flatMap((n) => {
    const photo = fits(n.photo, brand) ? n.photo : written.get(`${n.story?.id ?? n.key}:${n.key}`);
    return photo ? [{ key: n.key, prompt: photoPrompt(photo.prompt, brand.look ?? undefined), description: photo.description }] : [];
  });
}

/** An image file ready to join the library, with where it came from. */
export type ShotImageFile = {
  buffer: Buffer;
  ext: string;
  contentType: string;
  description: string;
  /** 'ai_generated' (made here) or 'scraped' (stock photo). */
  source: 'ai_generated' | 'scraped';
  /** The image model, or the stock site's name. */
  model: string;
  aiPrompt?: string;
  /** Stock photos: the search that found it and the business it was picked for (stockApproval.ts shares it later). */
  stock?: { query: string; business: string };
};

/** Stores one image for a shot and describes it as a normal library asset (searchable by the next deck). */
export async function storeShotAsset(file: ShotImageFile, need: ImageNeed, audience: string, categories: string[], workspaceId: string | null): Promise<LibraryAsset> {
  const id = randomUUID().replace(/-/g, '');
  const r2Key = blitzKeys.asset(id, file.ext);
  await uploadToR2(r2Key, file.buffer, file.contentType);

  const isAi = file.source === 'ai_generated';
  const mark = isAi ? 'AI' : 'Stock';
  const tags = [...categories.map(categoryLabel), mark];
  await prisma.blitzAsset.create({
    data: { id, type: 'BACKGROUND', r2Key, name: `${file.description.slice(0, 90)} [${mark}]`, tags, source: 'library', workspaceId },
  });
  const slots = SLOTS[need.role];
  const descriptor = {
    subject: file.description,
    meaning: `Shows: ${need.text}`,
    bestUse: `${need.role} shot for ${categories.map(categoryLabel).join(', ')} videos`,
    categories,
    ...(file.aiPrompt ? { aiPrompt: file.aiPrompt } : {}),
    ...(file.stock ? { stockQuery: file.stock.query, pickedFor: { business: file.stock.business, audience, categories } } : {}),
    textSafeZone: 'top_third',
  };
  const row = await prisma.assetDescriptor.create({
    data: {
      id: `desc-${id.slice(0, 12)}`,
      blitzAssetId: id,
      workspaceId,
      kind: 'background',
      source: file.source,
      status: 'done',
      model: file.model,
      descriptor,
      // The line it shows and its audience too: the next deck searches with "audience: line", and the bare
      // description alone often fell under the match threshold, so the same moment was drawn again.
      retrievalText: `${file.description} Shows: ${need.text} For ${audience} (${categories.map(categoryLabel).join(', ')}). ${mark} image for ${need.role} shots.`,
      rightsRisk: 'none',
      identifiablePerson: false,
      publicFigureLikely: false,
      textSafeZone: 'top_third',
      energyLevel: 0.5,
      categories,
      slotHook: slots.hook,
      slotProblem: slots.problem,
      slotProof: slots.proof,
      slotPayoff: slots.payoff,
      slotCta: slots.cta,
      nicheRealtor: categories.includes('real_estate') ? 0.9 : 0.3,
      nicheTiktokShop: categories.includes('retail_shopping') ? 0.9 : 0.3,
    },
  });
  await embedDescriptorRows([{ id: row.id, kind: 'background', retrieval_text: row.retrievalText, descriptor }]);

  return {
    assetId: id, kind: 'background', r2Key, name: file.description,
    trimStart: 0, trimEnd: 0, textSafeZone: 'top_third', retrievalText: file.description,
    score: 1, similarity: 1, categories,
  };
}

type Made = { audience: string; categories: string[]; workspaceId: string | null; model?: ReapiModelId };

/** Generates, stores and describes one image. Returns it as a library asset. */
async function createAsset(plan: ImagePlan, need: ImageNeed, made: Made): Promise<LibraryAsset> {
  const image = await generateVerticalImage(plan.prompt, made.model, need.priority);
  const model = made.model ? REAPI_MODELS[made.model].apiModel : VERTICAL_IMAGE_MODEL;
  const file: ShotImageFile = { ...image, description: plan.description, source: 'ai_generated', model, aiPrompt: plan.prompt };
  return storeShotAsset(file, need, made.audience, made.categories, made.workspaceId);
}

/**
 * Generates images for the shots the library could not cover. Runs in parallel; a failed image
 * leaves that shot on its best library match. `model`: Nano Banana 2.1 unless given. `onImage`: told as each need
 * settles (null = failed); needs left without a prompt are never told. Returns key → asset.
 */
export async function generateShotImages(
  audience: string,
  categories: string[],
  needs: ImageNeed[],
  workspaceId: string | null,
  brand: PhotoBrand,
  model?: ReapiModelId,
  onImage?: (key: string, image: LibraryAsset | null) => void,
): Promise<Map<string, LibraryAsset>> {
  const out = new Map<string, LibraryAsset>();
  if (needs.length === 0) return out;
  const plans = await planImages(audience, categories, needs, brand);
  const made: Made = { audience, categories, workspaceId, model };
  const results = await Promise.allSettled(plans.map((p) => createAsset(p, needs.find((n) => n.key === p.key)!, made).then(
    (image) => { onImage?.(p.key, image); return image; },
    (err: unknown) => { onImage?.(p.key, null); throw err; },
  )));
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') out.set(plans[i]!.key, r.value);
    else console.error(`[generatedAssets] image for ${plans[i]!.key} failed:`, r.reason);
  });
  console.log(`[generatedAssets] ${audience}: generated ${out.size}/${needs.length} image(s)`);
  return out;
}
