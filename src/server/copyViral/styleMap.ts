// The reference's look (Gemini's words) as the engine's style.json (tools/video-agent-engine/references/style-schema.md).
// Pure, so it is unit tested. Only keys the engine reads; what the words do not say keeps the engine default.

import type { CopyViralStyle } from '../../types/admin/copyViral';

export const CREATOR = {
  name: 'Guillaume',
  handle: '@happygiom',
  lang: 'en',
  niche: 'Next5: short-form posts on autopilot for US small businesses',
};

/** The creator block of every Copy Viral style.json (end card CTA included). */
export const CREATOR_BLOCK = { ...CREATOR, cta: { sub: 'Daily AI tips', button: 'Follow', done: 'Following' } };

const has = (text: string, ...words: string[]) => words.some((w) => text.toLowerCase().includes(w));

const NAMED: Record<string, string> = {
  red: '#FF2D2D', green: '#22D046', yellow: '#FFD60A', orange: '#FF7A00', blue: '#2F7BFF',
  purple: '#8B5CF6', pink: '#FF4FA3', cyan: '#22D3EE', teal: '#14B8A6',
};

const isGrey = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return Math.max(r, g, b) - Math.min(r, g, b) < 24;
};

/** First color in the text that is not white, black or grey: a hex, else a color name. */
export const pickAccent = (text: string): string | null => {
  const hex = (text.match(/#[0-9a-f]{6}\b/gi) ?? []).find((h) => !isGrey(h));
  if (hex) return hex.toUpperCase();
  const name = Object.keys(NAMED).find((n) => new RegExp(`\\b${n}\\b`, 'i').test(text));
  return name ? NAMED[name] : null;
};

/** Caption font from "condensed sans", "serif", "rounded"... (fonts the engine ships). */
const captionFont = (feel: string): { font: string; weight: number } => {
  if (has(feel, 'serif') && !has(feel, 'sans')) return { font: 'Instrument Serif', weight: 400 };
  if (has(feel, 'condensed', 'impact', 'poster')) return { font: 'Archivo', weight: 900 };
  if (has(feel, 'rounded', 'poppins')) return { font: 'Poppins', weight: 600 };
  return { font: 'Inter', weight: 800 };
};

/** Caption line y (center) from "lower third", "middle center", "top"... on a 1920 tall frame. */
export const captionY = (position: string): number => {
  if (has(position, 'top', 'upper')) return 420;
  if (has(position, 'bottom')) return 1480;
  if (has(position, 'lower')) return 1340;
  return 1150;
};

const noMusic = (music: string) => has(music, 'no music', 'none', 'no background', 'voice only');

export type EngineStyle = Record<string, unknown>;

export const toEngineStyle = (style: CopyViralStyle | null, name: string): EngineStyle => {
  const s = style ?? { captionFont: '', captionCase: '', captionPosition: '', captionWordsPerLine: 3, captionHighlight: '', colors: '', grade: '', transitions: '', hook: '', cta: '', music: '', soundEffects: '', notes: '' };
  const accent = pickAccent(`${s.captionHighlight} ${s.colors}`) ?? '#FFD60A';
  const { font, weight } = captionFont(s.captionFont);
  const block = has(s.captionHighlight, 'box', 'block', 'background', 'pill', 'highlighted');
  const captions: Record<string, unknown> = {
    font, weight, size: 66, maxWords: Math.min(5, Math.max(1, Math.round(s.captionWordsPerLine || 3))),
    ...(block ? { style: 'rise' } : { style: 'band', bg: 'none', color: '#FFFFFF', hi: accent, shadow: true }),
    ...(has(s.captionCase, 'upper', 'caps') ? { upper: true } : {}),
    ...(has(s.captionCase, 'lower') ? { lower: true } : {}),
  };
  return {
    version: 1,
    name,
    creator: CREATOR_BLOCK,
    // sheet = the outline of on-screen texts (board halo): dark, so white texts read on any video
    colors: { paper: '#111111', ink: '#111111', accent, sheet: '#000000', onAccent: '#111111' },
    font: { family: 'Inter' },
    display: { font: font === 'Instrument Serif' ? 'Instrument Serif' : 'Inter', weight: font === 'Instrument Serif' ? 400 : 900, text: 'Inter', flat: true },
    paper: { bg: 'flat', grain: 0, depth: 0.4 },
    captions,
    cuts: 'hard',
    grade: true,
    pace: { speed: 1.1 },
    sfx: { accents: 0 },
    zoom: { drift: has(s.transitions, 'push', 'slow zoom', 'zoom in') ? 0.008 : 0 },
    music: noMusic(s.music) ? { mute: true } : {},
    notes: [s.notes, s.hook && `Hook: ${s.hook}`, s.cta && `Ending: ${s.cta}`].filter(Boolean),
  };
};
