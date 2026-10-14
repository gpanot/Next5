// server-only — never import from a 'use client' file.
// The App shot routes' input: cleaned requests, and the pose files read from the site's own public folder.

import type { AppShotBackground, AppShotRequest } from '../../../../types/admin/slideshowCampaign';
import { HttpError } from '../../../http';
import type { LoadAsset } from './compose';

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const isId = (v: unknown): v is string => typeof v === 'string' && /^[\w-]{1,60}$/.test(v);

/** The scene text for "Generate scene". */
export const parseScene = (v: unknown): string => {
  const scene = text(v, 400);
  if (!scene) throw new HttpError(400, 'scene_required', 'Say where the phone is, like "a sunny golf course".');
  return scene;
};

const parseBackground = (v: unknown): AppShotBackground => {
  const r = (v ?? {}) as Record<string, unknown>;
  if ((r.source === 'scene' || r.source === 'unsplash') && isId(r.id)) return { source: r.source, id: r.id };
  return null;
};

export const parseAppShot = (v: unknown): AppShotRequest => {
  const r = (v ?? {}) as Record<string, unknown>;
  if (!isId(r.screenId)) throw new HttpError(400, 'screen_required', 'Upload your app screen.');
  const background = parseBackground(r.background);
  const scene = text(r.scene, 200);
  if (!background && !scene) throw new HttpError(400, 'scene_required', 'Say where the phone is, or pick a background.');
  return { pose: text(r.pose, 40), screenId: r.screenId, scene, background };
};

/** Pose files rarely change (a new build renames nothing), so each is fetched once per server instance. */
const cache = new Map<string, Promise<Buffer>>();

/** Reads pose files from the site's public folder over HTTP, at the request's own origin. */
export const poseLoader = (origin: string): LoadAsset => (path) => {
  let hit = cache.get(path);
  if (!hit) {
    hit = fetch(`${origin}${path}`, { signal: AbortSignal.timeout(20_000) }).then(async (res) => {
      if (!res.ok) throw new Error(`pose file ${path} (${res.status})`);
      return Buffer.from(await res.arrayBuffer());
    });
    hit.catch(() => cache.delete(path));
    cache.set(path, hit);
  }
  return hit;
};
