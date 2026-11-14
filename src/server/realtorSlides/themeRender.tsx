// server-only — never import from a 'use client' file.
// Renders a realtor slideshow's slides in its theme (src/lib/slideThemes.ts) as 1080x1920 JPEGs. Classic keeps the older
// look (whole photo framed over a blur, autoSlideshow/render.tsx); every other theme draws the photo full-bleed.

import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import type { ListingSlideshowKind } from '../../lib/realtorPlaybooks';
import type { SlideTheme } from '../../lib/slideThemes';
import { compressJpeg } from '../autoSlideshow/jpeg';
import { renderSlide, type PhotoCache } from '../autoSlideshow/render';
import { SLIDE_SIZE } from '../autoSlideshow/textPlacement';
import type { SlideText } from './copy';
import { framePhoto } from './photos';
import { loadThemeFonts } from './themeFonts';
import { themeLayers, type ThemeSlide } from './themeLooks';

const HOOK_LABEL: Record<ListingSlideshowKind, string> = {
  coming_soon: 'COMING SOON', room_by_room: 'HOME TOUR', neighborhood: 'NEARBY', buyers_miss: 'TOUR TIPS', status: 'STILL AVAILABLE',
  open_house_tips: 'OPEN HOUSE', open_house_today: 'OPEN HOUSE', price_drop: 'NEW PRICE', sold: 'SOLD',
};

/** The small tag over each slide's title. */
const labelOf = (kind: ListingSlideshowKind, role: SlideText['role'], n: number, items: number): string => {
  if (role === 'hook') return HOOK_LABEL[kind];
  if (role === 'cta') return kind === 'sold' ? 'THINKING OF SELLING?' : kind === 'coming_soon' ? 'YOUR GUESS?' : 'BOOK A TOUR';
  return kind === 'room_by_room' ? `ROOM ${n}` : `${n} / ${items}`;
};

/** The listing photo cropped to fill the 9:16 slide, as a JPEG data URI. */
const coverPhoto = async (url: string): Promise<string> => {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Listing photo ${res.status}: ${url}`);
  const jpeg = await sharp(Buffer.from(await res.arrayBuffer())).resize(SLIDE_SIZE.width, SLIDE_SIZE.height, { fit: 'cover' }).jpeg({ quality: 88 }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
};

const toThemeSlides = (kind: ListingSlideshowKind, texts: SlideText[]): ThemeSlide[] => {
  const items = texts.filter((t) => t.role === 'item').length;
  let n = 0;
  return texts.map((t, index) => {
    if (t.role === 'item') n += 1;
    return { ...t, label: labelOf(kind, t.role, n, items), number: t.role === 'item' ? n : null, index, total: texts.length };
  });
};

const renderOne = async (theme: Exclude<SlideTheme, 'classic'>, slide: ThemeSlide, photo: string): Promise<Buffer> => {
  const fonts = await loadThemeFonts();
  const res = new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', fontFamily: 'Inter' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain img only */}
        <img src={photo} width={SLIDE_SIZE.width} height={SLIDE_SIZE.height} alt="" style={{ position: 'absolute', top: 0, left: 0 }} />
        {themeLayers(theme, slide)}
      </div>
    ),
    { ...SLIDE_SIZE, fonts },
  );
  return compressJpeg(Buffer.from(await res.arrayBuffer()));
};

/** One JPEG per slide, in order. `photoUrls[i]` is slide i's listing photo. */
export const renderThemedSlides = async (theme: SlideTheme, kind: ListingSlideshowKind, texts: SlideText[], photoUrls: string[]): Promise<Buffer[]> => {
  if (theme === 'classic') {
    const cache: PhotoCache = new Map(photoUrls.map((u) => [u, framePhoto(u)]));
    return Promise.all(texts.map(async (t, i) => (await renderSlide(t, photoUrls[i]!, cache)).jpeg));
  }
  const slides = toThemeSlides(kind, texts);
  const photos = new Map<string, Promise<string>>();
  const photoOf = (u: string) => photos.get(u) ?? photos.set(u, coverPhoto(u)).get(u)!;
  return Promise.all(slides.map(async (s, i) => renderOne(theme, s, await photoOf(photoUrls[i]!))));
};
