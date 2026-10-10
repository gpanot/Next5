'use client';

/**
 * Caption style presets ("Caption Style Mix") and their "Aa" thumbnail. Shared by the editor's Text panel
 * (ContextPanel) and the Ideas deck's Hook button.
 */

import type React from 'react';
import { BLITZ_FONTS, BLITZ_DEFAULT_FONT } from '../../../remotion/fonts';
import { BLITZ_DEFAULT_TEXT_CONFIG } from '../../../config/blitzLab';
import type { TextConfig } from '../../../remotion/types';

// ── Caption style presets ─────────────────────────────────────────────────────

export type CaptionStyleDef = {
  id: string;
  label: string;
  /** Fields to merge into TextConfig when this style is applied. */
  patch: Partial<TextConfig>;
  /** Visual thumbnail properties used to render the "Aa" preview. */
  preview: {
    font: string;             // CSS font-family
    color: string;
    fontWeight: number;
    strokeWidth: number;
    strokeColor: string;
    textBg?: string;          // box background (Snapchat / White Box / Yellow Pop styles)
    thumbnailBg: string;      // thumbnail square background
  };
};

const _f = (label: string) => BLITZ_FONTS.find((f) => f.label === label)?.value ?? BLITZ_DEFAULT_FONT;

/** The look a new video starts with (BLITZ_DEFAULT_TEXT_CONFIG), so it can be picked again after trying others. */
const D = BLITZ_DEFAULT_TEXT_CONFIG;

export const CAPTION_STYLES: CaptionStyleDef[] = [
  {
    id: 'default',
    label: 'Default',
    patch: { font: _f(D.font), color: D.color, fontWeight: D.fontWeight, strokeWidth: D.strokeWidth, strokeColor: D.strokeColor, textBackground: undefined, lineHighlight: false },
    preview: { font: `${D.font}, sans-serif`, color: D.color, fontWeight: D.fontWeight, strokeWidth: 1, strokeColor: D.strokeColor, thumbnailBg: '#111111' },
  },
  {
    id: 'tiktok-classic',
    label: 'TikTok classic',
    // Same look as the Auto Slideshow hook text (server/autoSlideshow/render.tsx): Inter ExtraBold, white, 3px black
    // outline. The stroke is painted under the fill, so half of it shows: 6 here = 3px outside the glyphs.
    patch: { font: _f('Inter'), color: '#ffffff', fontWeight: 800, strokeWidth: 6, strokeColor: '#000000', textBackground: undefined, lineHighlight: false },
    preview: { font: 'Inter, sans-serif', color: '#ffffff', fontWeight: 800, strokeWidth: 2, strokeColor: '#000000', thumbnailBg: '#111111' },
  },
  {
    id: 'snapchat',
    label: 'Snapchat',
    patch: { font: _f('Poppins'), color: '#ffffff', fontWeight: 700, strokeWidth: 0, strokeColor: '#000000', textBackground: 'rgba(0,0,0,0.72)', lineHighlight: false },
    preview: { font: 'Poppins, sans-serif', color: '#ffffff', fontWeight: 700, strokeWidth: 0, strokeColor: '#000000', textBg: 'rgba(0,0,0,0.72)', thumbnailBg: '#444' },
  },
  {
    id: 'white-box',
    label: 'White box',
    patch: { font: _f('Inter'), color: '#111111', fontWeight: 700, strokeWidth: 0, strokeColor: '#000000', textBackground: 'rgba(255,255,255,0.95)', lineHighlight: false },
    preview: { font: 'Inter, sans-serif', color: '#111111', fontWeight: 700, strokeWidth: 0, strokeColor: '#000000', textBg: 'rgba(255,255,255,0.95)', thumbnailBg: '#555' },
  },
  {
    id: 'yellow-pop',
    label: 'Yellow pop',
    patch: { font: _f('Poppins'), color: '#FFE600', fontWeight: 800, strokeWidth: 0, strokeColor: '#000000', textBackground: '#000000', lineHighlight: false },
    preview: { font: 'Poppins, sans-serif', color: '#FFE600', fontWeight: 800, strokeWidth: 0, strokeColor: '#000000', textBg: '#000000', thumbnailBg: '#222' },
  },
  {
    id: 'clean-karaoke',
    label: 'Clean karaoke',
    patch: { font: _f('Montserrat'), color: '#ffffff', fontWeight: 600, strokeWidth: 0, strokeColor: '#000000', textBackground: undefined, lineHighlight: false },
    preview: { font: 'Montserrat, sans-serif', color: '#ffffff', fontWeight: 600, strokeWidth: 0, strokeColor: '#000000', thumbnailBg: '#1a1a1a' },
  },
  {
    id: 'tiktok-red',
    label: 'TikTok Red (popular)',
    // White capitals on a red highlight behind each line, like viral TikTok hooks.
    patch: { font: _f('TikTok Sans'), fontSize: 60, color: '#ffffff', fontWeight: 600, strokeWidth: 0, strokeColor: '#000000', textBackground: '#E8453C', lineHighlight: true },
    preview: { font: "'TikTok Sans', sans-serif", color: '#ffffff', fontWeight: 600, strokeWidth: 0, strokeColor: '#000000', textBg: '#E8453C', thumbnailBg: '#1a1a1a' },
  },
];

// ── Caption style thumbnail ───────────────────────────────────────────────────

export function StyleThumb({ style }: { style: CaptionStyleDef }) {
  const p = style.preview;
  const textEl = (
    <span
      style={{
        fontFamily: p.font,
        fontWeight: p.fontWeight,
        fontSize: 15,
        color: p.color,
        lineHeight: 1,
        letterSpacing: '0.01em',
        ...(p.strokeWidth > 0
          ? ({ WebkitTextStroke: `${p.strokeWidth}px ${p.strokeColor}`, paintOrder: 'stroke fill' } as React.CSSProperties)
          : {}),
      }}
    >
      Aa
    </span>
  );

  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 9,
        background: p.thumbnailBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {p.textBg ? (
        <div
          style={{
            background: p.textBg,
            borderRadius: 5,
            padding: '2px 5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {textEl}
        </div>
      ) : (
        textEl
      )}
    </div>
  );
}
