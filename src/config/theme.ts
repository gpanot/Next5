/**
 * Business palette for Next5 (marketing + studio): neutral ink with a signal-coral accent (2026-09, replaces
 * Mulberry Atelier). CSS tokens in app/globals.css mirror these values (tests/config/theme.test.ts keeps them in sync).
 * Coral is for accents only; buttons and CTAs use `cta` (black). Use THEME only where CSS variables can't reach:
 * emails, OG images, server-rendered SVG.
 */
export const THEME = {
  name: 'Ink & Coral',
  ground: '#ffffff',
  panel: '#ffffff',
  sunken: '#f4f4f5',
  blush: '#fdece8',
  ink: '#0b0b0c',
  muted: '#5b5b63',
  subtle: '#8a8a93',
  line: '#e7e7ea',
  accent: '#d9381e',
  accentInk: '#ffffff',
  cta: '#0b0b0c',
  ctaInk: '#ffffff',
  success: '#1f7a57',
  warning: '#a36a12',
  danger: '#b3263e',
  info: '#3f5e8c',
} as const;
