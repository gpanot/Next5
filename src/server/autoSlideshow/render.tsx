// server-only — never import from a 'use client' file.
// Step 6: burn each slide's text onto its photo, 1080x1350 JPEG, in TikTok's native look (what the proven slideshows use):
// hook = big white outlined text; meat and CTA = headline in a box (white, or the brand's box color), one plain line of
// white text under it.

import { ImageResponse } from 'next/og';
import type { AutoPhoto, AutoSlide } from '../../types/admin/autoSlideshow';
import type { SlideshowStyle } from '../../types/admin/companyIntel';
import { DEFAULT_BOX } from '../companyIntel/slideshowStyle';
import { getObject } from '../storage/objectStore';
import { compressJpeg } from './jpeg';

export const SLIDE_SIZE = { width: 1080, height: 1350 };

const FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@600;800';
type Font = { name: string; data: ArrayBuffer; weight: 600 | 800; style: 'normal' };
let fontsPromise: Promise<Font[]> | null = null;

/** Inter SemiBold + ExtraBold, fetched once per instance. Without a user agent Google serves TTF, which Satori reads. */
const loadFonts = (): Promise<Font[]> => {
  fontsPromise ??= fetch(FONT_CSS_URL)
    .then((res) => res.text())
    .then((css) => {
      const blocks = [...css.matchAll(/font-weight:\s*(\d+);[\s\S]*?src: url\((.+?)\)/g)];
      return Promise.all(blocks.map(async ([, weight, url]) => ({ name: 'Inter', data: await fetch(url!).then((r) => r.arrayBuffer()), weight: Number(weight) as 600 | 800, style: 'normal' as const })));
    })
    .catch(() => []);
  return fontsPromise;
};

/** Photo keys → data URIs, shared by every slide of a render pass (the same photo appears in many slideshows). */
export type PhotoCache = Map<string, Promise<string>>;

const photoUri = (key: string, cache: PhotoCache): Promise<string> => {
  const cached = cache.get(key);
  if (cached) return cached;
  const next = getObject(key).then((buf) => {
    if (!buf) throw new Error(`Photo ${key} is missing from storage`);
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  });
  cache.set(key, next);
  return next;
};

/** A thin black outline around white text, the TikTok caption look. */
const OUTLINE = '3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 0 4px 18px rgba(0,0,0,0.55)';
const SOFT = '0 2px 4px rgba(0,0,0,0.9), 0 0 16px rgba(0,0,0,0.6)';

const HookText = ({ title }: { title: string }) => (
  <div style={{ position: 'absolute', top: 360, left: 70, right: 70, display: 'flex', justifyContent: 'center' }}>
    <div style={{ display: 'flex', color: '#ffffff', fontSize: title.length > 40 ? 76 : 90, fontWeight: 800, lineHeight: 1.08, textAlign: 'center', textShadow: OUTLINE }}>{title}</div>
  </div>
);

/** The headline box colors of the brand's style. */
export type BoxLook = Pick<SlideshowStyle, 'boxColor' | 'boxTextColor'>;

const BoxedText = ({ title, body, big, look }: { title: string; body: string; big: boolean; look: BoxLook }) => (
  <div style={{ position: 'absolute', top: big ? 300 : 330, left: 80, right: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36 }}>
    <div style={{ display: 'flex', background: look.boxColor, color: look.boxTextColor, fontSize: big ? 62 : 54, fontWeight: 800, lineHeight: 1.12, padding: '16px 30px', borderRadius: 18, textAlign: 'center' }}>{title}</div>
    {body && <div style={{ display: 'flex', color: '#ffffff', fontSize: 44, fontWeight: 600, lineHeight: 1.2, textAlign: 'center', textShadow: SOFT }}>{body}</div>}
  </div>
);

/** One rendered slide as a JPEG. `look`: the brand's box colors (white box, dark text when the profile has no style). */
export const renderSlide = async (slide: Pick<AutoSlide, 'role' | 'title' | 'body'>, photoKeyForSlide: string, cache: PhotoCache, look: BoxLook = DEFAULT_BOX): Promise<Buffer> => {
  const [photo, fonts] = await Promise.all([photoUri(photoKeyForSlide, cache), loadFonts()]);
  const response = new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', fontFamily: 'Inter' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain img only */}
        <img src={photo} width={SLIDE_SIZE.width} height={SLIDE_SIZE.height} alt="" style={{ position: 'absolute', top: 0, left: 0 }} />
        {/* Light wash (8%, was 14%): keeps white text readable on bright skies without darkening the photo */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.08)' }} />
        {slide.role === 'hook' ? <HookText title={slide.title} /> : <BoxedText title={slide.title} body={slide.body} big={slide.role === 'cta'} look={look} />}
      </div>
    ),
    { ...SLIDE_SIZE, fonts: fonts.length ? fonts : undefined },
  );
  return compressJpeg(Buffer.from(await response.arrayBuffer()));
};

/**
 * Photo for each slide of the slideshow at `position`: consecutive photos from an offset that moves with the position,
 * so slideshows open on different photos and no photo repeats inside one slideshow (while there are enough photos).
 */
export const photoIndexes = (slideCount: number, position: number, available: number[]): number[] =>
  Array.from({ length: slideCount }, (_, i) => available[(position * 3 + i) % available.length]!);

/**
 * The photo of each slide of the slideshow at `position`: its own photo when made (every slide on bank runs, the hook on
 * older runs), else the run's shared pool (older runs), else another own photo of the same slideshow. Null when none exists.
 */
export const slidePhotoIndexes = (slides: AutoSlide[], position: number, photos: AutoPhoto[]): (number | null)[] => {
  const made = (i: number) => Boolean(photos[i]?.imageKey);
  const own = slides.map((s) => (s.photoPrompt && photos[s.photoIndex]?.kind && made(s.photoIndex) ? s.photoIndex : null));
  const pool = photos.flatMap((p, i) => (!p.kind && made(i) ? [i] : []));
  const fromPool = pool.length > 0 ? photoIndexes(slides.length, position, pool) : [];
  const spare = own.filter((i): i is number => i !== null);
  return slides.map((_, i) => own[i] ?? fromPool[i] ?? (spare.length > 0 ? spare[i % spare.length]! : null));
};
