// server-only — never import from a 'use client' file.
// Picks 8 beats + an end photo out of a 20-40 photo Zillow gallery, in walk-through order.
// Tags come from listings/photoTags.ts (one vision call). Within a bucket the gallery order wins:
// listing agents put their best shot of each room first.

import type { PhotoTag } from '../../lib/listingPhotos';

export type GalleryPhoto = { url: string; thumbUrl: string; tag: PhotoTag | null };

export type PlannedShot = { url: string; thumbUrl: string; tag: PhotoTag | 'feature'; role: 'hook' | 'location' | 'room' };

export type ShotPlan = { beats: PlannedShot[]; end: PlannedShot };

/** Room beats after the hook and the location beat, in tour order. 'feature' = a second living-type room. */
const ROOM_ORDER: (PhotoTag | 'feature')[] = ['living', 'kitchen', 'feature', 'bedroom', 'bath', 'yard'];
const MAX_ROOMS = 6;

/** Zillow serves up to 1024 px wide with the -p_f suffix (the scrape stores the 800 px "uncropped" one). */
export const largePhoto = (url: string): string => url.replace(/-[^-/]+\.(jpe?g|webp)$/i, '-p_f.jpg');

const take = (pool: GalleryPhoto[], used: Set<string>, tags: PhotoTag[]): GalleryPhoto | undefined => {
  const hit = pool.find((p) => p.tag !== null && tags.includes(p.tag) && !used.has(p.url));
  if (hit) used.add(hit.url);
  return hit;
};

const shot = (p: GalleryPhoto, role: PlannedShot['role'], tag?: PlannedShot['tag']): PlannedShot => ({
  url: largePhoto(p.url),
  thumbUrl: p.thumbUrl,
  tag: tag ?? p.tag ?? 'living',
  role,
});

const pickRoom = (pool: GalleryPhoto[], used: Set<string>, room: PhotoTag | 'feature'): PlannedShot | null => {
  if (room === 'feature') {
    const p = take(pool, used, ['living', 'dining']);
    return p ? shot(p, 'room', 'feature') : null;
  }
  const p = take(pool, used, room === 'kitchen' ? ['kitchen', 'dining'] : [room]);
  return p ? shot(p, 'room') : null;
};

/** Untagged photos (beyond the tagging cap, or failed) fill empty slots so short galleries still make a video. */
const fillers = (pool: GalleryPhoto[], used: Set<string>, need: number): PlannedShot[] =>
  pool
    .filter((p) => !used.has(p.url) && p.tag !== 'floorplan' && p.tag !== 'detail')
    .slice(0, need)
    .map((p) => {
      used.add(p.url);
      return shot(p, 'room');
    });

export const planShots = (gallery: GalleryPhoto[]): ShotPlan => {
  if (gallery.length < 4) throw new Error('Need at least 4 listing photos to make a video.');
  const used = new Set<string>();
  const hookPhoto = take(gallery, used, ['exterior', 'porch']) ?? gallery[0];
  used.add(hookPhoto.url);
  const locationPhoto = take(gallery, used, ['exterior', 'porch', 'aerial', 'yard']);
  const endPhoto = take(gallery, used, ['aerial']);
  const rooms = ROOM_ORDER.map((r) => pickRoom(gallery, used, r)).filter((s): s is PlannedShot => s !== null);
  const filled = rooms.length < 4 ? [...rooms, ...fillers(gallery, used, 4 - rooms.length)] : rooms;
  const beats = [
    shot(hookPhoto, 'hook'),
    ...(locationPhoto ? [shot(locationPhoto, 'location')] : []),
    ...filled.slice(0, MAX_ROOMS),
  ];
  const end = endPhoto ? shot(endPhoto, 'room', 'aerial') : shot(locationPhoto ?? hookPhoto, 'room', 'exterior');
  return { beats, end };
};
