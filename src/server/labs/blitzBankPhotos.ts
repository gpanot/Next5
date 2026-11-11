// server-only — never import from a 'use client' file.
//
// Photo prompts kept in the Blitz Script Bank, one batch ahead (2026-10-20): every unused story gets a prompt per shot
// of its card (blitzStoryPhotos.ts) right after it is written, so a batch only renders images. A batch story still
// without fitting prompts (a new target client, a bank still being built) gets them at batch time, saved back so it
// happens once. Writes go through a row lock, so prompts saved while stories are added are never lost.

import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { PhotoBrand } from '../slideshow/core/shotPhotos';
import type { BlitzBankContent } from './blitzBank';
import { photosFit, writeStoryPhotos, type StoryPhotos } from './blitzStoryPhotos';

type Audience = BlitzBankContent['audiences'][number];
type Story = Audience['stories'][number];

/** Unused stories given prompts per backfill: two batches ahead. */
const BACKFILL_STORIES = 30;

/** Read-modify-write of a bank's content under a row lock. `change` returns null to leave it as it is. */
export async function updateBankContent(brandProfileId: string, change: (content: BlitzBankContent) => BlitzBankContent | null): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const [row] = await tx.$queryRaw<Array<{ content: BlitzBankContent | null }>>`
      SELECT content FROM blitz_script_banks WHERE brand_profile_id = ${brandProfileId} FOR UPDATE`;
    const next = row?.content ? change(row.content) : null;
    if (next) await tx.blitzScriptBank.update({ where: { brandProfileId }, data: { content: next as unknown as Prisma.InputJsonValue } });
  });
}

/** `next` with the prompts `current` has for its stories (saved while `next` was being written). */
export const carryPhotos = (next: BlitzBankContent, current: BlitzBankContent): BlitzBankContent => {
  const saved = new Map(current.audiences.flatMap((a) => a.stories.flatMap((s) => (s.photos ? [[s.id, s.photos] as const] : []))));
  return { audiences: next.audiences.map((a) => ({ ...a, stories: a.stories.map((s) => (saved.has(s.id) ? { ...s, photos: saved.get(s.id) } : s)) })) };
};

const savePhotos = (brandProfileId: string, photos: Map<string, StoryPhotos>) =>
  photos.size === 0 ? Promise.resolve() : updateBankContent(brandProfileId, (content) => ({
    audiences: content.audiences.map((a) => ({ ...a, stories: a.stories.map((s) => (photos.has(s.id) ? { ...s, photos: photos.get(s.id) } : s)) })),
  }));

/** Writes prompts for these stories, audience by audience, and saves them. Returns story id → prompts. */
async function writeAndSave(brandProfileId: string, todo: Array<{ a: Audience; s: Story }>, brand: PhotoBrand): Promise<Map<string, StoryPhotos>> {
  const audiences = [...new Set(todo.map((t) => t.a))];
  const written = await Promise.all(audiences.map((a) => writeStoryPhotos(brand, a.idc, a.categories,
    todo.filter((t) => t.a === a).map(({ s }) => ({ id: s.id, story: s.story, format: s.format, hook: s.hooks[0]?.text })))));
  const photos = new Map(written.flatMap((m) => [...m]));
  await savePhotos(brandProfileId, photos);
  return photos;
}

const running = new Set<string>();

/** Prompts for the next unused stories that lack fitting ones. One run per bank at a time. Never throws. */
export async function backfillStoryPhotos(brandProfileId: string, content: BlitzBankContent, usage: Map<string, number>, brand: PhotoBrand): Promise<void> {
  if (running.has(brandProfileId)) return;
  running.add(brandProfileId);
  try {
    const todo = content.audiences.flatMap((a) => a.stories.filter((s) => !usage.has(s.id) && !photosFit(s.photos, brand)).map((s) => ({ a, s }))).slice(0, BACKFILL_STORIES);
    if (todo.length === 0) return;
    const t0 = Date.now();
    const photos = await writeAndSave(brandProfileId, todo, brand);
    console.log(`[BlitzBank] photo prompts for ${photos.size}/${todo.length} story(ies) of profile ${brandProfileId} in ${Date.now() - t0}ms`);
  } catch (err) {
    console.error(`[BlitzBank] photo prompts not backfilled for profile ${brandProfileId}:`, err instanceof Error ? err.message : err);
  } finally {
    running.delete(brandProfileId);
  }
}

/** Fitting prompts of a batch's stories: from the bank, or written now (in story order) and saved back. Never throws. */
export async function batchStoryPhotos(brandProfileId: string, content: BlitzBankContent, storyIds: string[], brand: PhotoBrand): Promise<Map<string, StoryPhotos>> {
  const all = content.audiences.flatMap((a) => a.stories.map((s) => ({ a, s })));
  const mine = storyIds.flatMap((id) => all.filter((t) => t.s.id === id));
  const out = new Map(mine.flatMap(({ s }) => (photosFit(s.photos, brand) ? [[s.id, s.photos!] as const] : [])));
  const todo = mine.filter(({ s }) => !out.has(s.id));
  if (todo.length === 0) return out;
  const t0 = Date.now();
  const written = await writeAndSave(brandProfileId, todo, brand).catch((err: unknown) => {
    console.error(`[BlitzBank] batch photo prompts failed for profile ${brandProfileId}:`, err instanceof Error ? err.message : err);
    return new Map<string, StoryPhotos>();
  });
  console.log(`[BlitzBank] batch photo prompts: ${out.size} from the bank, ${written.size}/${todo.length} written in ${Date.now() - t0}ms`);
  return new Map([...out, ...written]);
}
