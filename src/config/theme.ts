/**
 * Mulberry Atelier — the single palette for Next5 (decision D11).
 * CSS tokens in app/globals.css mirror these values (tests/config/theme.test.ts keeps them in sync).
 * Use THEME only where CSS variables can't reach: emails, OG images, server-rendered SVG.
 */
export const THEME = {
  name: 'Mulberry Atelier',
  ground: '#faf7f8',
  panel: '#ffffff',
  sunken: '#f3ecef',
  blush: '#f5e6ee',
  ink: '#1d1520',
  muted: '#6e6270',
  subtle: '#9a8d9c',
  line: '#eadfe5',
  accent: '#8e2a5c',
  accentBright: '#c2548b',
  accentInk: '#ffffff',
  success: '#1f7a57',
  warning: '#a36a12',
  danger: '#b3263e',
  info: '#3f5e8c',
} as const;
