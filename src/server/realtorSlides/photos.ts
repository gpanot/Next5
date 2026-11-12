// server-only — never import from a 'use client' file.
// Listing photos for playbook slideshows: the real Zillow gallery only, never a generated room (P20, AB 723).
// Zillow photos are landscape (≤1024 px); a full-bleed 9:16 crop keeps a third of the room and looks soft. So each slide
// shows the whole photo, sharp, in the lower middle, over a blurred copy of itself; the text sits above it.

import sharp from 'sharp';
import { isPhotoTag } from '../../lib/listingPhotos';
import type { ListingSlideshowKind as SlideshowKind } from '../../lib/realtorPlaybooks';
import { SLIDE_SIZE } from '../autoSlideshow/textPlacement';
import { largePhoto, planShots, type GalleryPhoto, type PlannedShot } from '../realtorVideo/shotPlan';

type Candidate = { url?: string; thumbUrl?: string; tag?: string | null };

export const galleryOf = (candidates: unknown): GalleryPhoto[] =>
  (Array.isArray(candidates) ? (candidates as Candidate[]) : [])
    .filter((c): c is Required<Pick<Candidate, 'url' | 'thumbUrl'>> & Candidate => Boolean(c.url && c.thumbUrl))
    .map((c) => ({ url: c.url, thumbUrl: c.thumbUrl, tag: isPhotoTag(c.tag) ? c.tag : null }));

export type SlidePhoto = { url: string; tag: string };

const asPhoto = (s: PlannedShot): SlidePhoto => ({ url: s.url, tag: s.tag });

/** Photos in slide order (hook first, CTA last) for each slideshow kind. */
export const photosFor = (kind: SlideshowKind, gallery: GalleryPhoto[]): SlidePhoto[] => {
  const plan = planShots(gallery);
  const [hook, ...rest] = plan.beats;
  const rooms = rest.filter((b) => b.role === 'room');
  const outside = [hook!, ...rest.filter((b) => b.role === 'location'), plan.end];
  const spare = gallery.filter((g) => g.tag !== 'floorplan').map((g) => ({ url: largePhoto(g.url), tag: g.tag ?? 'room' }));
  const pick = (list: (PlannedShot | SlidePhoto)[], n: number): SlidePhoto[] => {
    const out = list.slice(0, n).map((p) => ('role' in p ? asPhoto(p) : p));
    for (const s of spare) if (out.length < n && !out.some((o) => o.url === s.url)) out.push(s);
    return out;
  };
  switch (kind) {
    case 'coming_soon':
      return pick([hook!, ...rooms.slice(0, 2), plan.end], 4);
    case 'room_by_room':
      return pick([hook!, ...rooms.slice(0, 6), plan.end], Math.min(8, rooms.length + 2));
    case 'neighborhood':
      return pick([...outside, ...rooms], 7);
    case 'buyers_miss':
      return pick([hook!, ...rooms.slice(0, 3), plan.end], 5);
    case 'status':
    case 'open_house_today':
    case 'price_drop':
      return pick([hook!, ...rooms.slice(0, 2), plan.end], 4);
    case 'open_house_tips':
      return pick([hook!, ...rooms.slice(0, 5), plan.end], 7);
    case 'sold':
      return pick([hook!, rooms[0] ?? plan.end, plan.end], 3);
  }
};

/** Where the sharp photo sits on the 1080x1920 slide: full width, below the text block. */
export const PHOTO_TOP = 960;

/** One 9:16 frame as a JPEG data URI: blurred fill + the whole photo, sharp. */
export const framePhoto = async (url: string): Promise<string> => {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Listing photo ${res.status}: ${url}`);
  const input = Buffer.from(await res.arrayBuffer());
  const { width, height } = SLIDE_SIZE;
  const background = await sharp(input).resize(width, height, { fit: 'cover' }).blur(40).modulate({ brightness: 0.7 }).toBuffer();
  const photo = await sharp(input).resize({ width, height: Math.round(height * 0.45), fit: 'inside' }).toBuffer({ resolveWithObject: true });
  const top = Math.min(PHOTO_TOP, height - photo.info.height - 140);
  const left = Math.round((width - photo.info.width) / 2);
  const jpeg = await sharp(background).composite([{ input: photo.data, top, left }]).jpeg({ quality: 88 }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
};
