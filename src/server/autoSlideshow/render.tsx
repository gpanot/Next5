// server-only — never import from a 'use client' file.
// Step 6: burn each slide's text onto its photo, 1080x1920 (9:16) JPEG, in TikTok's native look (what the proven slideshows use):
// hook = big white outlined text; meat and CTA = headline in a box (white, or the brand's box color), one plain line of
// white text under it.

import { ImageResponse } from 'next/og';
import type { AutoPhoto, AutoSlide, HeadBox } from '../../types/admin/autoSlideshow';
import type { SlideshowStyle } from '../../types/admin/companyIntel';
import { DEFAULT_BOX } from '../companyIntel/slideshowStyle';
import { getObject } from '../storage/objectStore';
import { compressJpeg } from './jpeg';
import { bodyKind, type TextAt } from '../../types/slideText';
import { BODY_LOOK, BOLD_CHAR, BOX_TEXT, CAPS_TEXT, HOOK_TEXT, isBig, outlineSize, placeText, RED_TEXT, SEMI_CHAR, SLIDE_SIZE, titleKindOf, wrapLines } from './textPlacement';

/** Inter SemiBold + ExtraBold for every look; Montserrat ExtraBold Italic for All caps. */
const FONT_CSS = [
  { name: 'Inter', style: 'normal', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@600;800' },
  { name: 'Montserrat', style: 'italic', url: 'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@1,800' },
] as const;
type Font = { name: string; data: ArrayBuffer; weight: 600 | 800; style: 'normal' | 'italic' };
let fontsPromise: Promise<Font[]> | null = null;

/** One family's files. Without a user agent Google serves TTF, which Satori reads. */
const loadFamily = ({ name, style, url }: (typeof FONT_CSS)[number]): Promise<Font[]> =>
  fetch(url)
    .then((res) => res.text())
    .then((css) => {
      const blocks = [...css.matchAll(/font-weight:\s*(\d+);[\s\S]*?src: url\((.+?)\)/g)];
      return Promise.all(blocks.map(async ([, weight, file]) => ({ name, data: await fetch(file!).then((r) => r.arrayBuffer()), weight: Number(weight) as 600 | 800, style })));
    })
    .catch(() => []);

/** Every font, fetched once per instance. */
const loadFonts = (): Promise<Font[]> => {
  fontsPromise ??= Promise.all(FONT_CSS.map(loadFamily)).then((families) => families.flat());
  return fontsPromise;
};

/** Photo keys → data URIs, shared by every slide of a render pass (the same photo appears in many slideshows). */
export type PhotoCache = Map<string, Promise<string>>;

export const photoUri = (key: string, cache: PhotoCache): Promise<string> => {
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

/** Where the text block sits: its top and its sideways shift from center, in px. */
type Spot = { top: number; dx: number };

const spotOf = (at: TextAt): Spot => ({ top: Math.round(at.y * SLIDE_SIZE.height), dx: Math.round((at.x - 0.5) * SLIDE_SIZE.width) });

/** TikTok default: big white outlined headline, the line under it in its own look. */
const OutlinedText = ({ slide, spot }: { slide: RenderedText; spot: Spot }) => (
  <div style={{ position: 'absolute', top: spot.top, left: HOOK_TEXT.side + spot.dx, right: HOOK_TEXT.side - spot.dx, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: BOX_TEXT.gap }}>
    <div style={{ display: 'flex', color: '#ffffff', fontSize: outlineSize(slide), fontWeight: 800, lineHeight: HOOK_TEXT.lineHeight, textAlign: 'center', textShadow: OUTLINE }}>{slide.title}</div>
    {slide.body && <BodyLine body={slide.body} look={slide.bodyLook} />}
  </div>
);

/** All caps: white Montserrat ExtraBold Italic capitals with a soft shadow, the line under it in its own look. */
const CapsText = ({ slide, spot }: { slide: RenderedText; spot: Spot }) => (
  <div style={{ position: 'absolute', top: spot.top, left: CAPS_TEXT.side + spot.dx, right: CAPS_TEXT.side - spot.dx, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: BOX_TEXT.gap }}>
    <div style={{ display: 'flex', fontFamily: 'Montserrat', fontStyle: 'italic', color: '#ffffff', fontSize: CAPS_TEXT.fontSize(slide.role, slide.title), fontWeight: 800, lineHeight: CAPS_TEXT.lineHeight, textAlign: 'center', textShadow: SOFT }}>{slide.title.toUpperCase()}</div>
    {slide.body && <BodyLine body={slide.body} look={slide.bodyLook} />}
  </div>
);

/** The headline box colors of the brand's style. */
export type BoxLook = Pick<SlideshowStyle, 'boxColor' | 'boxTextColor'>;

const BoxedText = ({ title, body, bodyLook, big, look, spot }: { title: string; body: string; bodyLook: BodyLook; big: boolean; look: BoxLook; spot: Spot }) => (
  <div style={{ position: 'absolute', top: spot.top, left: BOX_TEXT.side + spot.dx, right: BOX_TEXT.side - spot.dx, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: BOX_TEXT.gap }}>
    <div style={{ display: 'flex', background: look.boxColor, color: look.boxTextColor, fontSize: BOX_TEXT.titleSize(big), fontWeight: 800, lineHeight: BOX_TEXT.titleLineHeight, padding: `${BOX_TEXT.padY}px ${BOX_TEXT.padX}px`, borderRadius: 18, textAlign: 'center' }}>{title}</div>
    {body && <BodyLine body={body} look={bodyLook} />}
  </div>
);

type BodyLook = AutoSlide['bodyLook'];

/** The line under the headline in its own look: TikTok's plain white text, a black or white box, or red behind each line. */
const BodyLine = ({ body, look }: { body: string; look: BodyLook }) => {
  const text = { fontSize: BOX_TEXT.bodySize, fontWeight: 600 } as const;
  const kind = bodyKind(look);
  if (kind === 'all-caps') {
    return <div style={{ display: 'flex', fontFamily: 'Montserrat', fontStyle: 'italic', fontSize: CAPS_TEXT.bodySize, fontWeight: 800, color: '#ffffff', lineHeight: CAPS_TEXT.bodyLineHeight, textAlign: 'center', textShadow: SOFT }}>{body.toUpperCase()}</div>;
  }
  if (kind === 'black-box' || kind === 'white-box') {
    const colors = kind === 'black-box' ? BLACK_BOX : WHITE_BOX;
    return <div style={{ ...text, display: 'flex', background: colors.boxColor, color: colors.boxTextColor, lineHeight: BOX_TEXT.bodyLineHeight, padding: `${BODY_LOOK.boxPadY}px ${BODY_LOOK.boxPadX}px`, borderRadius: BODY_LOOK.radius, textAlign: 'center' }}>{body}</div>;
  }
  if (kind === 'tiktok-red') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {wrapLines(body, BOX_TEXT.bodySize, SEMI_CHAR, SLIDE_SIZE.width - (BOX_TEXT.side + BODY_LOOK.redPadX) * 2).map((line, i) => (
          <div key={i} style={{ ...text, display: 'flex', background: RED_TEXT.color, color: '#ffffff', lineHeight: BODY_LOOK.redLineHeight, padding: `0 ${BODY_LOOK.redPadX}px`, borderRadius: 8 }}>{line.text}</div>
        ))}
      </div>
    );
  }
  return <div style={{ ...text, display: 'flex', color: '#ffffff', lineHeight: BOX_TEXT.bodyLineHeight, textAlign: 'center', textShadow: SOFT }}>{body}</div>;
};

/** The White box and Black box looks, whatever the brand's box colors. */
const WHITE_BOX: BoxLook = { boxColor: '#ffffff', boxTextColor: '#111111' };
const BLACK_BOX: BoxLook = { boxColor: '#111111', boxTextColor: '#ffffff' };

/** TikTok Red: white text on a red highlight behind each line (lines wrapped here, as Satori cannot box each line). */
const RedText = ({ title, body, bodyLook, spot }: { title: string; body: string; bodyLook: BodyLook; spot: Spot }) => (
  <div style={{ position: 'absolute', top: spot.top, left: RED_TEXT.side + spot.dx, right: RED_TEXT.side - spot.dx, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: BOX_TEXT.gap }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {wrapLines(title, RED_TEXT.fontSize, BOLD_CHAR, SLIDE_SIZE.width - (RED_TEXT.side + RED_TEXT.padX) * 2).map((line, i) => (
        <div key={i} style={{ display: 'flex', background: RED_TEXT.color, color: '#ffffff', fontSize: RED_TEXT.fontSize, fontWeight: 800, lineHeight: RED_TEXT.lineHeight, padding: `0 ${RED_TEXT.padX}px`, borderRadius: 10 }}>{line.text}</div>
      ))}
    </div>
    {body && <BodyLine body={body} look={bodyLook} />}
  </div>
);

/** The slide's text in its headline's look (types/slideText.ts): outlined, a box (brand, black, white) or TikTok Red. */
const SlideText = ({ slide, look, spot }: { slide: RenderedText; look: BoxLook; spot: Spot }) => {
  const kind = titleKindOf(slide);
  if (kind === 'tiktok-red') return <RedText title={slide.title} body={slide.body} bodyLook={slide.bodyLook} spot={spot} />;
  if (kind === 'outline') return <OutlinedText slide={slide} spot={spot} />;
  if (kind === 'all-caps') return <CapsText slide={slide} spot={spot} />;
  const colors = kind === 'white-box' ? WHITE_BOX : kind === 'black-box' ? BLACK_BOX : look;
  return <BoxedText title={slide.title} body={slide.body} bodyLook={slide.bodyLook} big={isBig(slide)} look={colors} spot={spot} />;
};

/** What a render draws: the slide's text, its look, and where it was moved to (if it was). */
type RenderedText = Pick<AutoSlide, 'role' | 'title' | 'body' | 'look' | 'textAt' | 'bodyLook'>;

/** A rendered slide and where its text went (stored as the slide's `placedAt`, so the editor can drag it from there). */
export type RenderedSlide = { jpeg: Buffer; at: TextAt };

/**
 * One rendered slide as a JPEG. `look`: the brand's box colors (white box, dark text when the profile has no style).
 * `heads`: the photo's heads (heads.ts); the text moves off them, and keeps its usual spot when they are unknown. Text
 * moved by hand (`textAt`) stays where it was put.
 */
export const renderSlide = async (slide: RenderedText, photoKeyForSlide: string, cache: PhotoCache, look: BoxLook = DEFAULT_BOX, heads?: HeadBox[] | null): Promise<RenderedSlide> => {
  const [photo, fonts] = await Promise.all([photoUri(photoKeyForSlide, cache), loadFonts()]);
  const at = placeText(slide, heads);
  const response = new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', fontFamily: 'Inter' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain img only */}
        <img src={photo} width={SLIDE_SIZE.width} height={SLIDE_SIZE.height} alt="" style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }} />
        {/* Light wash (8%, was 14%): keeps white text readable on bright skies without darkening the photo */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.08)' }} />
        <SlideText slide={slide} look={look} spot={spotOf(at)} />
      </div>
    ),
    { ...SLIDE_SIZE, fonts: fonts.length ? fonts : undefined },
  );
  return { jpeg: await compressJpeg(Buffer.from(await response.arrayBuffer())), at };
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
