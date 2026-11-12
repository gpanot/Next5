// server-only — never import from a 'use client' file.
// Picks 8 beats + an end photo out of a 20-40 photo Zillow gallery, in walk-through order.
// Tags come from listings/photoTags.ts (one vision call). Within a bucket the gallery order wins:
// listing agents put their best shot of each room first.

import type { PhotoTag } from '../../lib/listingPhotos';

export type GalleryPhoto = { url: string; thumbUrl: string; tag: PhotoTag | null };

export type PlannedShot = {
  url: string;
  thumbUrl: string;
  tag: PhotoTag | 'feature';
  role: 'hook' | 'location' | 'room';
  /** Second photo of the same beat (templates that show two photos per idea, e.g. "3 things I love"). */
  url2?: string;
};

export type ShotPlan = { beats: PlannedShot[]; end: PlannedShot };

/** Room beats after the hook and the location beat, in tour order. 'feature' = a second living-type room. */
const ROOM_ORDER: (PhotoTag | 'feature')[] = ['living', 'kitchen', 'feature', 'bedroom', 'bath', 'yard'];
const MAX_ROOMS = 6;
/** Second pass for long (Auto) videos: more rooms of the same kinds, still in tour order. */
const EXTRA_ORDER: PhotoTag[][] = [['bedroom'], ['bath'], ['living', 'dining'], ['yard', 'aerial'], ['detail'], ['exterior', 'porch']];

export type PlanOptions = { rooms?: number; location?: boolean };

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

const extraRooms = (pool: GalleryPhoto[], used: Set<string>, need: number): PlannedShot[] => {
  const out: PlannedShot[] = [];
  for (let pass = 0; pass < 3 && out.length < need; pass++) {
    for (const tags of EXTRA_ORDER) {
      if (out.length >= need) break;
      const p = take(pool, used, tags);
      if (p) out.push(shot(p, 'room'));
    }
  }
  return out;
};

export const planShots = (gallery: GalleryPhoto[], { rooms: maxRooms = MAX_ROOMS, location = true }: PlanOptions = {}): ShotPlan => {
  if (gallery.length < 4) throw new Error('Need at least 4 listing photos to make a video.');
  const used = new Set<string>();
  const hookPhoto = take(gallery, used, ['exterior', 'porch']) ?? gallery[0];
  used.add(hookPhoto.url);
  const locationPhoto = location ? take(gallery, used, ['exterior', 'porch', 'aerial', 'yard']) : undefined;
  const endPhoto = take(gallery, used, ['aerial']);
  const rooms = ROOM_ORDER.map((r) => pickRoom(gallery, used, r)).filter((s): s is PlannedShot => s !== null);
  const more = maxRooms > MAX_ROOMS ? extraRooms(gallery, used, maxRooms - rooms.length) : [];
  const all = [...rooms, ...more];
  const filled = all.length < Math.min(4, maxRooms) ? [...all, ...fillers(gallery, used, Math.min(4, maxRooms) - all.length)] : all;
  const beats = [
    shot(hookPhoto, 'hook'),
    ...(locationPhoto ? [shot(locationPhoto, 'location')] : []),
    ...filled.slice(0, maxRooms),
  ];
  const end = endPhoto ? shot(endPhoto, 'room', 'aerial') : shot(locationPhoto ?? hookPhoto, 'room', 'exterior');
  return { beats, end };
};

/** Gives each room beat a second photo of the same room, when the gallery has one ("3 things I love"). */
export const pairSameRoom = (plan: ShotPlan, gallery: GalleryPhoto[]): ShotPlan => {
  const used = new Set([...plan.beats.map((b) => b.url), plan.end.url]);
  const beats = plan.beats.map((b) => {
    if (b.role !== 'room') return b;
    const tags: (PhotoTag | null)[] = b.tag === 'feature' ? ['living', 'dining'] : b.tag === 'kitchen' ? ['kitchen', 'dining'] : [b.tag];
    const twin = gallery.find((p) => tags.includes(p.tag) && !used.has(largePhoto(p.url)));
    if (!twin) return b;
    used.add(largePhoto(twin.url));
    return { ...b, url2: largePhoto(twin.url) };
  });
  return { ...plan, beats };
};
