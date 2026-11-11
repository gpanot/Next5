import type { CSSProperties } from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont as loadSerif } from '@remotion/google-fonts/InstrumentSerif';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadCaveat } from '@remotion/google-fonts/Caveat';
import { loadFont as loadNunito } from '@remotion/google-fonts/Nunito';

export const SERIF = loadSerif('normal', { weights: ['400'], subsets: ['latin'] }).fontFamily;
loadSerif('italic', { weights: ['400'] });
export const SANS = loadInter('normal', { weights: ['400', '600', '800', '900'], subsets: ['latin'] }).fontFamily;
export const HAND = loadCaveat('normal', { weights: ['600', '700'] }).fontFamily;
export const ROUNDED = loadNunito('normal', { weights: ['800', '900'] }).fontFamily;

export const FPS = 30;
export const W = 1080;
export const H = 1920;

/** Resolve a photo path: http(s) URLs pass through, anything else is a public/ file. */
export const photoSrc = (p: string) => (/^https?:\/\//.test(p) ? p : staticFile(p));

/** 0→1 ease over `frames` frames starting at `start`. */
export const ease = (frame: number, start: number, frames: number) =>
  interpolate(frame, [start, start + frames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

export const usePop = (delay = 0, damping = 14) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, stiffness: 160, mass: 0.7 } });
};

type PanProps = {
  src: string;
  frames: number;
  /** Horizontal travel as a fraction of the overflow (-1 left edge … 1 right edge). */
  fromX?: number;
  toX?: number;
  fromScale?: number;
  toScale?: number;
  style?: CSSProperties;
};

/** Photo that covers its box and drifts (Ken Burns). Pan reveals the width a 9:16 crop hides. */
export const PanPhoto = ({ src, frames, fromX = 0, toX = 0, fromScale = 1, toScale = 1.06, style }: PanProps) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, frames], [0, 1], { extrapolateRight: 'clamp' });
  const smooth = t * t * (3 - 2 * t);
  const x = fromX + (toX - fromX) * smooth;
  const scale = fromScale + (toScale - fromScale) * smooth;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', ...style }}>
      <Img
        src={photoSrc(src)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: `${50 + x * 50}% 50%`,
          transform: `scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Warm grade + vignette (G1). */
export const WarmFinish = () => (
  <AbsoluteFill
    style={{
      background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(20,10,0,0.55) 100%)',
      mixBlendMode: 'multiply',
    }}
  />
);

/** Dark gradient behind text so white type stays readable on bright rooms. */
export const Scrim = ({ from = 'top', strength = 0.55, size = 40 }: { from?: 'top' | 'bottom'; strength?: number; size?: number }) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(to ${from === 'top' ? 'bottom' : 'top'}, rgba(0,0,0,${strength}) 0%, rgba(0,0,0,0) ${size}%)`,
    }}
  />
);

/** Frames per beat for a 15 s video: hook beat + N middle beats + end beat. */
export const beatFrames = (beats: number, totalS = 15, endS = 2.5) => Math.round(((totalS - endS) * FPS) / beats);
