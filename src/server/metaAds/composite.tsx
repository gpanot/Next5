// server-only — never import from a 'use client' file.
// Step 5: burn the overlay text and brand chip onto the step 4 image, as a 1080x1350 (4:5) JPEG.

import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import type { ReactElement } from 'react';

export const AD_SIZE = { width: 1080, height: 1350 };

export const isCaptionStyle = (style: string) => style === 'UGC selfie' || style === 'Testimonial';

const FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@800';
let fontPromise: Promise<ArrayBuffer | null> | null = null;

/** Inter ExtraBold, fetched once per instance. Without a user agent Google serves TTF, which Satori reads. */
const loadFont = (): Promise<ArrayBuffer | null> => {
  fontPromise ??= fetch(FONT_CSS_URL)
    .then((res) => res.text())
    .then((css) => css.match(/src: url\((.+?)\)/)?.[1] ?? null)
    .then((url) => (url ? fetch(url).then((res) => res.arrayBuffer()) : null))
    .catch(() => null);
  return fontPromise;
};

const toDataUri = async (url: string): Promise<string> => {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Could not download image (${res.status})`);
  const jpeg = await sharp(Buffer.from(await res.arrayBuffer()))
    .resize(AD_SIZE.width, AD_SIZE.height, { fit: 'cover' })
    .jpeg({ quality: 90 })
    .toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
};

/** Where the hook sits: chosen per image so it never covers the face (see placement.ts). */
export type TextPlacement = 'top' | 'bottom';

export type CompositeInput = {
  imageUrl: string;
  overlayText: string;
  brandName: string;
  style: string;
  accent: string;
  placement: TextPlacement;
};

const BrandChip = ({ name }: { name: string }) => (
  <div style={{ position: 'absolute', top: 48, left: 48, display: 'flex', background: '#ffffff', color: '#111111', fontSize: 30, padding: '10px 20px', borderRadius: 12 }}>
    {name.toUpperCase()}
  </div>
);

/** Yellow caption bar: reads like a creator's on-screen text. Low by default, high when the face is low. */
const CaptionLayout = ({ text, accent, placement }: { text: string; accent: string; placement: TextPlacement }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, ...(placement === 'bottom' ? { bottom: 170 } : { top: 190 }), display: 'flex', justifyContent: 'center', padding: '0 80px' }}>
    <div style={{ display: 'flex', background: accent, color: '#111111', fontSize: 64, lineHeight: 1.1, padding: '14px 28px', textAlign: 'center' }}>{text}</div>
  </div>
);

/** Big centered claim over a dark wash. */
const BoldLayout = ({ text }: { text: string }) => (
  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 100, background: 'rgba(0,0,0,0.45)' }}>
    <div style={{ display: 'flex', color: '#ffffff', fontSize: 104, lineHeight: 1.02, textAlign: 'center', letterSpacing: -2 }}>{text}</div>
  </div>
);

/** Headline over a soft gradient: at the top by default, at the bottom when the subject fills the top. */
const HeadlineLayout = ({ text, placement }: { text: string; placement: TextPlacement }) =>
  placement === 'top' ? (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 560, display: 'flex', alignItems: 'flex-end', padding: '0 64px 150px', backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0))' }}>
      <div style={{ display: 'flex', color: '#ffffff', fontSize: 84, lineHeight: 1.04, letterSpacing: -1.5 }}>{text}</div>
    </div>
  ) : (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 520, display: 'flex', alignItems: 'flex-end', padding: '0 64px 110px', backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0))' }}>
      <div style={{ display: 'flex', color: '#ffffff', fontSize: 84, lineHeight: 1.04, letterSpacing: -1.5 }}>{text}</div>
    </div>
  );

const overlayFor = (input: CompositeInput): ReactElement => {
  if (isCaptionStyle(input.style)) return <CaptionLayout text={input.overlayText} accent={input.accent} placement={input.placement} />;
  if (input.style === 'Bold text') return <BoldLayout text={input.overlayText} />;
  return <HeadlineLayout text={input.overlayText} placement={input.placement} />;
};

export const compositeAd = async (input: CompositeInput): Promise<Buffer> => {
  const [background, font] = await Promise.all([toDataUri(input.imageUrl), loadFont()]);
  const response = new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', fontFamily: 'Inter' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain img only */}
        <img src={background} width={AD_SIZE.width} height={AD_SIZE.height} alt="" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        {overlayFor(input)}
        <BrandChip name={input.brandName} />
      </div>
    ),
    { ...AD_SIZE, fonts: font ? [{ name: 'Inter', data: font, weight: 800, style: 'normal' }] : undefined },
  );
  const png = Buffer.from(await response.arrayBuffer());
  return sharp(png).jpeg({ quality: 88 }).toBuffer();
};
