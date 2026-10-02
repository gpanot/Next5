// server-only — never import from a 'use client' file.
// The still images a Blitz Slideshow deck uses (library photos and the AI images the engine made),
// with their description, for the deck's "Assets" modal: list, regenerate (AI images, same prompt)
// and delete.

import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/db';
import { deleteFromR2, uploadToR2 } from '../../lib/r2';
import { blitzBrowserUrl, blitzKeys, blitzMediaKind } from '../admin/blitzStore';
import { generateVerticalImage } from '../ai/imageGeneration';
import { HttpError } from '../http';

export type DeckImageDto = {
  id: string;
  r2Key: string;
  url: string;
  name: string;
  /** Made by the deck engine; it can be regenerated from its prompt. */
  isAi: boolean;
  prompt: string | null;
  subject: string | null;
  meaning: string | null;
  bestUse: string | null;
  setting: string | null;
  retrievalText: string | null;
  categories: string[];
};

type DescriptorJson = { aiPrompt?: string; subject?: string; meaning?: string; bestUse?: string; setting?: string };

type AssetWithDescriptor = {
  id: string;
  r2Key: string;
  name: string;
  descriptor: { descriptor: unknown; retrievalText: string | null; categories: string[]; source: string | null } | null;
};

const MAX_KEYS = 120;

async function toDto(asset: AssetWithDescriptor): Promise<DeckImageDto> {
  const d = (asset.descriptor?.descriptor ?? {}) as DescriptorJson;
  return {
    id: asset.id,
    r2Key: asset.r2Key,
    url: await blitzBrowserUrl(asset.r2Key),
    name: asset.name,
    isAi: Boolean(d.aiPrompt) || asset.descriptor?.source === 'ai_generated',
    prompt: d.aiPrompt ?? null,
    subject: d.subject ?? null,
    meaning: d.meaning ?? null,
    bestUse: d.bestUse ?? null,
    setting: d.setting ?? null,
    retrievalText: asset.descriptor?.retrievalText ?? null,
    categories: asset.descriptor?.categories ?? [],
  };
}

const withDescriptor = { descriptor: { select: { descriptor: true, retrievalText: true, categories: true, source: true } } } as const;

/** The deck's still images, by R2 key, in the order given. Videos and unknown keys are skipped. */
export async function listDeckImages(keys: string[]): Promise<DeckImageDto[]> {
  const unique = [...new Set(keys.filter((k) => typeof k === 'string' && k))].slice(0, MAX_KEYS);
  const rows = await prisma.blitzAsset.findMany({ where: { r2Key: { in: unique }, type: 'BACKGROUND' }, include: withDescriptor });
  const images = rows.filter((r) => blitzMediaKind(r.r2Key) === 'image');
  images.sort((a, b) => unique.indexOf(a.r2Key) - unique.indexOf(b.r2Key));
  return Promise.all(images.map(toDto));
}

/** Refuses when a queued or running render still reads this file. */
async function assertNotRendering(r2Key: string) {
  const active = await prisma.blitzProject.findMany({
    where: { renderStatus: { in: ['PENDING', 'PROCESSING'] } },
    select: { currentAssets: true },
  });
  if (active.some((p) => JSON.stringify(p.currentAssets).includes(r2Key))) {
    throw new HttpError(409, 'in_render', 'This image is used by a render in progress. Try again when it finishes.');
  }
}

async function findImage(id: string) {
  const asset = await prisma.blitzAsset.findUnique({ where: { id }, include: withDescriptor });
  if (!asset || asset.type !== 'BACKGROUND' || blitzMediaKind(asset.r2Key) !== 'image') {
    throw new HttpError(404, 'not_found', 'Image not found.');
  }
  return asset;
}

/**
 * New image from the same prompt, in place: same asset id, description, scores and embedding,
 * new file. Finished renders are separate files, so they keep working.
 */
export async function regenerateDeckImage(id: string): Promise<DeckImageDto> {
  const asset = await findImage(id);
  const prompt = ((asset.descriptor?.descriptor ?? {}) as DescriptorJson).aiPrompt;
  if (!prompt) throw new HttpError(422, 'no_prompt', 'Only AI images can be regenerated.');
  await assertNotRendering(asset.r2Key);

  const image = await generateVerticalImage(prompt);
  // A new key, so browsers and signed URLs never show the old picture.
  const r2Key = blitzKeys.asset(`${id}-${randomUUID().slice(0, 8)}`, image.ext);
  await uploadToR2(r2Key, image.buffer, image.contentType);
  const updated = await prisma.blitzAsset.update({ where: { id }, data: { r2Key }, include: withDescriptor });
  await prisma.assetDescriptor.updateMany({ where: { blitzAssetId: id }, data: { model: 'gpt-image-2.5-flare' } });
  await deleteFromR2(asset.r2Key).catch((err) => console.warn('[deckImages] old file delete failed:', err));
  return toDto(updated);
}

/** Removes the image from the library (its description goes with it) and deletes the file. */
export async function deleteDeckImage(id: string): Promise<{ r2Key: string }> {
  const asset = await findImage(id);
  await assertNotRendering(asset.r2Key);
  await prisma.blitzAsset.delete({ where: { id } });
  await deleteFromR2(asset.r2Key).catch((err) => console.warn('[deckImages] file delete failed:', err));
  return { r2Key: asset.r2Key };
}
