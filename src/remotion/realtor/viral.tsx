/**
 * Shared pieces for the viral-format presets: big photos, TikTok/Reels safe zone, native-looking text.
 * Safe zone (1080×1920): keep text between y 230 and y 1480, x 60 to 940 (right rail = like/comment icons,
 * bottom = caption + username + music line).
 */
import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion';
import { loadFont as loadTikTok } from '@remotion/google-fonts/TikTokSans';
import { photoSrc } from './shared';

export const TT = loadTikTok('normal', { weights: ['700', '800', '900'], subsets: ['latin'] }).fontFamily;

export const SAFE = { top: 230, bottom: 1480, left: 60, right: 940 } as const;

/** 4:5 photo window: 1080×1350, the biggest a landscape photo gets before it turns soft. */
export const HERO_H = 1350;

/** The same photo, blurred and dimmed, fills the frame behind the window (no black bars). */
export const BlurFill = ({ src, dim = 0.55 }: { src: string; dim?: number }) => (
  <AbsoluteFill style={{ overflow: 'hidden' }}>
    <Img
      src={photoSrc(src)}
      style={{ width: '100%', height: '100%', objectFit: 'cover', filter: `blur(40px) brightness(${dim})`, transform: 'scale(1.25)' }}
    />
  </AbsoluteFill>
);

type HeroProps = {
  src: string;
  frames: number;
  top?: number;
  height?: number;
  /** End scale of the slow push (no panning). */
  push?: number;
  /** Horizontal focus 0–100 (% of the photo kept at the centre). */
  focusX?: number;
  style?: CSSProperties;
  children?: ReactNode;
};

/** Photo window with a slow, steady push-in only. */
export const HeroPhoto = ({ src, frames, top = 285, height = HERO_H, push = 1.05, focusX = 50, style, children }: HeroProps) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, frames], [1, push], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', top, left: 0, width: 1080, height, overflow: 'hidden', ...style }}>
      <Img src={photoSrc(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${focusX}% 50%`, transform: `scale(${scale})` }} />
      {children}
    </div>
  );
};

/** TikTok native text: white rounded box behind each line, black heavy text. */
export const NativeBox = ({ lines, size = 66, bg = '#fff', color = '#000', style }: { lines: string[]; size?: number; bg?: string; color?: string; style?: CSSProperties }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ...style }}>
    {lines.map((line) => (
      <span
        key={line}
        style={{ background: bg, color, fontFamily: TT, fontWeight: 800, fontSize: size, lineHeight: 1.18, padding: '4px 22px', borderRadius: 14, marginTop: -2, textAlign: 'center' }}
      >
        {line}
      </span>
    ))}
  </div>
);

/** White heavy text with a black outline and soft shadow (classic caption look). */
export const outlineText = (size: number): CSSProperties => ({
  fontFamily: TT,
  fontWeight: 900,
  fontSize: size,
  color: '#fff',
  WebkitTextStroke: `${Math.round(size / 14)}px #000`,
  paintOrder: 'stroke fill',
  textShadow: '0 6px 18px rgba(0,0,0,0.45)',
  lineHeight: 1.05,
});

/** Quick white flash on hard cuts — reads as a "beat" even without sound. */
export const CutFlash = ({ frames = 4 }: { frames?: number }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, frames], [0.55, 0], { extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ background: '#fff', opacity: o, pointerEvents: 'none' }} />;
};
