// server-only — never import from a 'use client' file.
// Import pipeline per post: fetch (treg) → save slides → read slides (vision) → draft or join a model.
// Reads run a few at a time; the model step runs one at a time, so ten posts of one creator join one model instead of
// each starting its own.

import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { ReferenceSlide, SlideshowPattern } from '../../types/admin/slideshowKnowledge';
import { createMeter, type CostMeter } from '../metaAds/cost';
import { runPool } from '../pool';
import { clip } from '../metaAds/text';
import { draftModel, type KnownModel } from './buildModel';
import { readSlides, saveSlides } from './readSlides';
import { fetchPhotoPost, POST_FETCH_MICROS, postIdOf, type PhotoPost } from './tiktokPosts';

const READ_CONCURRENCY = 3;
/** Models shown to the drafting call so it can recognise a known structure. */
const KNOWN_MODELS = 40;

/** Short links have no id until fetched: they get a stand-in id, replaced once TikTok answers. */
const standInId = (url: string) => `link:${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;

/** Creates a pending reference per new link. Links already imported are skipped. Returns the new ids. */
export const createReferences = async (urls: string[]): Promise<{ ids: string[]; skipped: number }> => {
  const unique = [...new Set(urls.map((u) => u.trim()).filter(Boolean))];
  const rows = unique.map((url) => ({ sourceUrl: url, postId: postIdOf(url) ?? standInId(url) }));
  const existing = await prisma.slideshowReference.findMany({ where: { postId: { in: rows.map((r) => r.postId) } }, select: { postId: true } });
  const taken = new Set(existing.map((e) => e.postId));
  const fresh = rows.filter((r) => !taken.has(r.postId));
  const created = await prisma.$transaction(fresh.map((data) => prisma.slideshowReference.create({ data, select: { id: true } })));
  return { ids: created.map((c) => c.id), skipped: rows.length - fresh.length };
};

const json = (value: unknown) => value as Prisma.InputJsonValue;

/** Saves what TikTok returned. A short link that turns out to be an imported post is dropped as a duplicate. */
const recordPost = async (id: string, post: PhotoPost): Promise<boolean> => {
  const twin = await prisma.slideshowReference.findUnique({ where: { postId: post.postId }, select: { id: true } });
  if (twin && twin.id !== id) {
    await prisma.slideshowReference.delete({ where: { id } });
    return false;
  }
  const { views, likes, saves, shares, comments } = post.stats;
  await prisma.slideshowReference.update({
    where: { id },
    data: { postId: post.postId, sourceUrl: post.url, creator: post.creator, caption: clip(post.caption, 2_000), postedAt: post.postedAt, views, likes, saves, shares, comments },
  });
  return true;
};

/** Union of niche tags; "golftips" and "golf tips" count as one. */
export const mergeNiches = (current: string[], added: string[]): string[] => {
  const byKey = new Map<string, string>();
  for (const n of [...current, ...added]) {
    const key = n.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (key && !byKey.has(key)) byKey.set(key, n.toLowerCase().trim());
  }
  return [...byKey.values()].slice(0, 6);
};

const hookKey = (hook: string) => hook.toLowerCase().replace(/[^a-z[\]]/g, '');

/** Adds a newly proven hook to the model's variants, unless it is the main hook or already listed. */
export const withHook = (pattern: SlideshowPattern, hook: string): SlideshowPattern => {
  const variants = pattern.hookVariants ?? [];
  const known = new Set([pattern.hookPattern, ...variants].map(hookKey));
  return known.has(hookKey(hook)) || !hook.trim() ? { ...pattern, hookVariants: variants } : { ...pattern, hookVariants: [...variants, hook].slice(0, 12) };
};

let modelLock: Promise<unknown> = Promise.resolve();

/** Runs `work` after every earlier call has finished (in this process). */
const oneAtATime = <T>(work: () => Promise<T>): Promise<T> => {
  const next = modelLock.then(work, work);
  modelLock = next.catch(() => undefined);
  return next;
};

const knownModels = async (): Promise<KnownModel[]> => {
  const rows = await prisma.slideshowModel.findMany({ where: { status: { not: 'archived' } }, orderBy: { updatedAt: 'desc' }, take: KNOWN_MODELS });
  return rows.map((m) => ({ id: m.id, name: m.name, pattern: m.pattern as unknown as SlideshowPattern }));
};

/** Drafts a model for the post, or attaches the post to the model that already has its structure. */
const assignModel = (id: string, post: PhotoPost, slides: ReferenceSlide[], meter: CostMeter) =>
  oneAtATime(async () => {
    const draft = await draftModel({ slides, caption: post.caption, stats: post.stats, creator: post.creator }, await knownModels(), meter);
    if (draft.sameAsModelId) {
      const model = await prisma.slideshowModel.findUniqueOrThrow({ where: { id: draft.sameAsModelId } });
      const pattern = withHook(model.pattern as unknown as SlideshowPattern, draft.pattern.hookPattern);
      await prisma.slideshowModel.update({ where: { id: model.id }, data: { niches: mergeNiches(model.niches, draft.niches), pattern: json(pattern) } });
      return model.id;
    }
    const model = await prisma.slideshowModel.create({ data: { name: draft.name, niches: draft.niches, pattern: json(draft.pattern) } });
    return model.id;
  });

/** Imports one reference end to end. Never throws: failures are saved on the row. */
export const processReference = async (id: string): Promise<void> => {
  const meter = createMeter();
  try {
    const ref = await prisma.slideshowReference.update({ where: { id }, data: { status: 'reading', error: null } });
    meter.add('TikTok post fetch', POST_FETCH_MICROS);
    const post = await fetchPhotoPost(ref.sourceUrl);
    if (!(await recordPost(id, post))) return;
    const slides = await readSlides(await saveSlides(post), post.caption, meter);
    await prisma.slideshowReference.update({ where: { id }, data: { slides: json(slides) } });
    const modelId = await assignModel(id, post, slides, meter);
    await prisma.slideshowReference.update({ where: { id }, data: { modelId, status: 'ready', costMicros: { increment: meter.summary().usdMicros } } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[slideshow-knowledge] reference ${id} failed:`, message);
    await prisma.slideshowReference
      .update({ where: { id }, data: { status: 'failed', error: clip(message, 1_000), costMicros: { increment: meter.summary().usdMicros } } })
      .catch(() => undefined);
  }
};

export const runImport = (ids: string[]): Promise<void> => runPool(ids, READ_CONCURRENCY, processReference);
