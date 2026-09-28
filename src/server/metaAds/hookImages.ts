// server-only — never import from a 'use client' file.
// Every hook of an ad is pre-rendered on its image right after the hooks are written, so picking one only swaps
// which stored JPEG is the ad's final image. A hook picked before its render finished is rendered on the spot.

import type { MetaAd, Prisma } from '@prisma/client';
import type { AdHook, BrandProfile } from '../../types/admin/metaAds';
import { prisma } from '../../lib/db';
import { putObject } from '../storage/objectStore';
import { createMeter } from './cost';
import { placementFor, renderHook } from './design';

/** Renders at once per ad; each render is a fast local job once the image is cached. */
const RENDER_CONCURRENCY = 3;

/** Versioned, so a re-render never reuses a URL the browser already cached. */
const hookKey = (ad: MetaAd, hookId: string) => `admin/meta-ads/${ad.runId}/${ad.id}-hook-${hookId}-${Date.now().toString(36)}.jpg`;

const hooksOf = (ad: MetaAd) => (ad.hooks as AdHook[] | null) ?? [];

const loadProfile = async (runId: string): Promise<BrandProfile> => {
  const run = await prisma.metaAdRun.findUniqueOrThrow({ where: { id: runId }, select: { profile: true } });
  if (!run.profile) throw new Error('The run has no brand profile');
  return run.profile as unknown as BrandProfile;
};

/** Renders one hook on the ad's image and stores it. Returns the object key. */
export const renderHookAsset = async (ad: MetaAd, hook: AdHook, profile?: BrandProfile): Promise<string> => {
  const placement = await placementFor(ad, createMeter());
  const key = hookKey(ad, hook.id);
  await putObject(key, await renderHook(ad, profile ?? (await loadProfile(ad.runId)), hook.text, placement), 'image/jpeg');
  return key;
};

/**
 * Saves rendered keys onto the ad's current hooks. Skips any hook whose text changed since (new hooks were written)
 * and everything when the image changed (a regenerate), since those renders show the old image.
 */
const saveKeys = async (ad: MetaAd, keys: Map<string, { text: string; key: string }>) => {
  const latest = await prisma.metaAd.findUnique({ where: { id: ad.id } });
  if (!latest || latest.rawImageUrl !== ad.rawImageUrl) return;
  const hooks = hooksOf(latest).map((h) => {
    const done = keys.get(h.id);
    return done && done.text === h.text ? { ...h, assetKey: done.key } : h;
  });
  await prisma.metaAd.update({ where: { id: ad.id }, data: { hooks: hooks as unknown as Prisma.InputJsonValue } });
};

/** Pre-renders every hook that has no image yet. Never throws: a hook left unrendered is rendered when picked. */
export const prerenderHooks = async (adId: string): Promise<void> => {
  try {
    const ad = await prisma.metaAd.findUniqueOrThrow({ where: { id: adId } });
    const todo = hooksOf(ad).filter((h) => !h.assetKey);
    if (!ad.rawImageUrl || todo.length === 0) return;
    const profile = await loadProfile(ad.runId);
    await placementFor(ad, createMeter()).then((textPlacement) => Object.assign(ad, { textPlacement }));
    const keys = new Map<string, { text: string; key: string }>();
    for (let i = 0; i < todo.length; i += RENDER_CONCURRENCY) {
      await Promise.all(todo.slice(i, i + RENDER_CONCURRENCY).map(async (h) => keys.set(h.id, { text: h.text, key: await renderHookAsset(ad, h, profile) })));
    }
    await saveKeys(ad, keys);
  } catch (err) {
    console.error(`[meta-ads] hook pre-render for ad ${adId} failed:`, err instanceof Error ? err.message : err);
  }
};

/** The image changed (regenerate): old hook renders show the old image, so they are dropped. */
export const clearHookAssets = async (ad: MetaAd): Promise<void> => {
  const hooks = hooksOf(ad);
  if (hooks.length === 0) return;
  await prisma.metaAd.update({ where: { id: ad.id }, data: { hooks: hooks.map((h) => ({ ...h, assetKey: undefined })) as unknown as Prisma.InputJsonValue } });
};
