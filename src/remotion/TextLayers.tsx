/**
 * Blitz Lab text layers: the caption and the business line.
 * Both use the same bundled font (fonts.ts) so preview and render match.
 * data-blitz-layer attributes let the editor hit-test and outline them.
 */

import type React from 'react';
import { AbsoluteFill } from 'remotion';
import { BUSINESS_DEFAULTS } from './businessDefaults';
import { resolveBlitzFont } from './fonts';
import type { TextConfig } from './types';


type CaptionProps = { text: string; config: TextConfig; width: number; height: number };

export function CaptionLayer({ text, config, width, height }: CaptionProps) {
  const strokeW = config.strokeWidth ?? 3;
  const strokeC = config.strokeColor ?? '#000000';
  const bg = config.textBackground;

  const textStyle: React.CSSProperties = {
    fontFamily: resolveBlitzFont(config.font),
    fontSize: config.fontSize,
    fontWeight: config.fontWeight ?? 700,
    color: config.color ?? '#ffffff',
    textAlign: 'center',
    whiteSpace: 'pre-wrap',
    // paint-order keeps the stroke outside the glyphs so thick strokes stay readable
    ...(strokeW > 0
      ? ({ WebkitTextStroke: `${strokeW}px ${strokeC}`, paintOrder: 'stroke fill' } as React.CSSProperties)
      : { textShadow: '0 2px 8px rgba(0,0,0,0.8)' }),
    margin: 0,
    lineHeight: 1.25,
    maxWidth: width - config.safeZonePadding * 2,
  };

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        // Caption bottom edge sits at positionY × height from the top.
        paddingBottom: height * (1 - config.positionY),
        paddingLeft: config.safeZonePadding,
        paddingRight: config.safeZonePadding,
        transform: config.offsetX ? `translateX(${config.offsetX}px)` : undefined,
      }}
    >
      {bg ? (
        <div
          data-blitz-layer="TEXT"
          style={{
            background: bg,
            borderRadius: Math.round(config.fontSize * 0.28),
            paddingLeft: Math.round(config.fontSize * 0.55),
            paddingRight: Math.round(config.fontSize * 0.55),
            paddingTop: Math.round(config.fontSize * 0.18),
            paddingBottom: Math.round(config.fontSize * 0.18),
            maxWidth: width - config.safeZonePadding * 2,
          }}
        >
          <p style={{ ...textStyle, maxWidth: '100%' }}>{text}</p>
        </div>
      ) : (
        <p data-blitz-layer="TEXT" style={textStyle}>
          {text}
        </p>
      )}
    </AbsoluteFill>
  );
}

type BusinessProps = { text: string; config: TextConfig; height: number };

export function BusinessLayer({ text, config, height }: BusinessProps) {
  const positionY = config.businessPositionY ?? BUSINESS_DEFAULTS.positionY;
  const offsetX = config.businessOffsetX ?? BUSINESS_DEFAULTS.offsetX;
  const fontSize = config.businessFontSize ?? BUSINESS_DEFAULTS.fontSize;
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: height * (1 - positionY),
        paddingLeft: config.safeZonePadding,
        paddingRight: config.safeZonePadding,
        transform: offsetX ? `translateX(${offsetX}px)` : undefined,
      }}
    >
      <div
        data-blitz-layer="BUSINESS"
        style={{
          fontFamily: resolveBlitzFont(config.font),
          fontSize,
          fontWeight: 700,
          color: '#111111',
          background: 'rgba(255,255,255,0.95)',
          borderRadius: fontSize * 0.6,
          padding: `${fontSize * 0.3}px ${fontSize * 0.7}px`,
          textAlign: 'center',
          lineHeight: 1.2,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
}
