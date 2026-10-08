/**
 * Slideshow caption that appears word by word: each word springs up 3 frames after the one before.
 * Same layout and look as CaptionLayer's plain style (no box); boxed styles keep CaptionLayer and its fade.
 */

import type React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { resolveBlitzFont } from './fonts';
import type { TextConfig } from './types';

const FIRST_WORD_FRAME = 2;
const WORD_GAP_FRAMES = 3;
const WORD_SPRING = { damping: 12, stiffness: 180, mass: 0.6 };

type Props = { text: string; config: TextConfig; width: number; height: number };

export function WordPopCaption({ text, config, width, height }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const strokeW = config.strokeWidth ?? 3;
  // Split on spaces only: line breaks the user typed stay inside their word (pre-wrap).
  const words = text.trim().split(/ +/);

  const textStyle: React.CSSProperties = {
    fontFamily: resolveBlitzFont(config.font),
    fontSize: config.fontSize,
    fontWeight: config.fontWeight ?? 700,
    color: config.color ?? '#ffffff',
    textAlign: 'center',
    whiteSpace: 'pre-wrap',
    margin: 0,
    lineHeight: 1.25,
    maxWidth: width - config.safeZonePadding * 2,
    ...(strokeW > 0
      ? ({ WebkitTextStroke: `${strokeW}px ${config.strokeColor ?? '#000000'}`, paintOrder: 'stroke fill' } as React.CSSProperties)
      : { textShadow: '0 2px 8px rgba(0,0,0,0.8)' }),
  };

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: height * (1 - config.positionY),
        paddingLeft: config.safeZonePadding,
        paddingRight: config.safeZonePadding,
        transform: config.offsetX ? `translateX(${config.offsetX}px)` : undefined,
      }}
    >
      <p data-blitz-layer="TEXT" style={textStyle}>
        {words.map((word, i) => {
          const s = spring({ frame: frame - FIRST_WORD_FRAME - i * WORD_GAP_FRAMES, fps, config: WORD_SPRING });
          const opacity = interpolate(s, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' });
          return (
            <span key={i}>
              <span style={{ display: 'inline-block', opacity, transform: `translateY(${(1 - s) * 30}px) scale(${0.7 + 0.3 * s})` }}>
                {word}
              </span>
              {i < words.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </p>
    </AbsoluteFill>
  );
}
