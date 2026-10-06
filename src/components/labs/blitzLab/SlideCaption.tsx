'use client';

/**
 * Caption drawn in plain HTML exactly like CaptionLayer (remotion/TextLayers.tsx) draws it in the video:
 * same font, size, weight, color, stroke and background, scaled to the preview's width.
 * Used by the Slideshow editor preview and the deck cards, so both match the render.
 * The parent must set `containerType: 'inline-size'`: sizes are in cqw of the 1080-wide canvas.
 */

import type React from 'react';
import { useEffect } from 'react';
import { loadBlitzFonts } from '../../../remotion/fontLoader';
import { resolveBlitzFont } from '../../../remotion/fonts';
import type { TextConfig } from '../../../remotion/types';

/** Maps TextConfig values to CSS proportional to the 9:16 preview container. */
function cssTextStyle(config: TextConfig): React.CSSProperties {
  const strokeW = config.strokeWidth ?? 3;
  const strokeC = config.strokeColor ?? '#000000';
  return {
    fontFamily: resolveBlitzFont(config.font),
    // Scale font relative to the container width (1080px canvas → 100cqw in this preview).
    // cqw requires containerType: 'inline-size' on the parent — set on the canvas div.
    fontSize: `${(config.fontSize / 1080) * 100}cqw`,
    fontWeight: config.fontWeight ?? 700,
    color: config.color ?? '#ffffff',
    textAlign: 'center' as const,
    whiteSpace: 'pre-wrap' as const,
    lineHeight: 1.25,
    ...(strokeW > 0
      ? ({ WebkitTextStroke: `${(strokeW / 1080) * 100}cqw ${strokeC}`, paintOrder: 'stroke fill' } as React.CSSProperties)
      : { textShadow: '0 2px 8px rgba(0,0,0,0.8)' }),
    padding: '0 8%',
    margin: 0,
  };
}

/** Same proportions as CaptionLayer (remotion/TextLayers.tsx), in cqw of the 1080-wide canvas. */
const cqw = (px: number) => `${(px / 1080) * 100}cqw`;

/** Caption paragraph with the style's background: per-line highlight (TikTok Red) or one box. */
export function CaptionText({ text, config, dim }: { text: string; config: TextConfig; dim?: boolean }) {
  // Caption fonts normally load with the Remotion player; HTML previews have none, so load them here.
  // Without them the browser falls back to the emoji font, whose wide spaces split the words.
  useEffect(loadBlitzFonts, []);
  const base = { ...cssTextStyle(config), ...(dim ? { opacity: 0.35 } : {}) };
  const bg = config.textBackground;
  if (!bg) return <p style={base}>{text}</p>;
  const fs = config.fontSize;
  if (config.lineHighlight) {
    return (
      <p style={{ ...base, textTransform: 'uppercase', textShadow: 'none', lineHeight: 1.3 }}>
        <span
          style={{
            background: bg,
            borderRadius: cqw(fs * 0.14),
            padding: `${cqw(fs * 0.06)} ${cqw(fs * 0.3)}`,
            boxDecorationBreak: 'clone',
            WebkitBoxDecorationBreak: 'clone',
          }}
        >
          {text}
        </span>
      </p>
    );
  }
  return (
    <p style={{ ...base, textShadow: 'none' }}>
      <span
        style={{
          display: 'inline-block',
          background: bg,
          borderRadius: cqw(fs * 0.28),
          padding: `${cqw(fs * 0.18)} ${cqw(fs * 0.55)}`,
        }}
      >
        {text}
      </span>
    </p>
  );
}

/** Caption placed on a 9:16 canvas: its bottom edge at positionY of the height, like the render. */
export function SlideCaption({ text, config, positionY }: { text: string; config: TextConfig; positionY?: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-[1] flex justify-center"
      style={{ bottom: `${(1 - (positionY ?? config.positionY ?? 0.15)) * 100}%` }}
    >
      <CaptionText text={text} config={config} />
    </div>
  );
}
