/**
 * Blitz Lab caption fonts.
 *
 * Loaded from Google Fonts through @remotion/google-fonts, so the browser preview
 * and the headless worker render draw the exact same glyphs. loadFont() also
 * holds the render (delayRender) until the font file is ready.
 * Only latin + the weights we offer are fetched, to keep loading fast.
 */

import { loadFont as loadAnton } from '@remotion/google-fonts/Anton';
import { loadFont as loadBebasNeue } from '@remotion/google-fonts/BebasNeue';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadMontserrat } from '@remotion/google-fonts/Montserrat';
import { loadFont as loadOswald } from '@remotion/google-fonts/Oswald';
import { loadFont as loadPoppins } from '@remotion/google-fonts/Poppins';

const loaded = [
  { label: 'Montserrat', family: loadMontserrat('normal', { weights: ['400', '600', '700', '800', '900'], subsets: ['latin'] }).fontFamily },
  { label: 'Anton', family: loadAnton('normal', { weights: ['400'], subsets: ['latin'] }).fontFamily },
  { label: 'Bebas Neue', family: loadBebasNeue('normal', { weights: ['400'], subsets: ['latin'] }).fontFamily },
  { label: 'Poppins', family: loadPoppins('normal', { weights: ['400', '600', '700', '800', '900'], subsets: ['latin'] }).fontFamily },
  { label: 'Oswald', family: loadOswald('normal', { weights: ['400', '500', '600', '700'], subsets: ['latin'] }).fontFamily },
  { label: 'Inter', family: loadInter('normal', { weights: ['400', '600', '700', '800', '900'], subsets: ['latin'] }).fontFamily },
];

/** Emoji glyphs come from the system (Noto Color Emoji on the worker). */
const EMOJI_FALLBACK = "'Apple Color Emoji', 'Noto Color Emoji', 'Segoe UI Emoji', sans-serif";

export type BlitzFont = { label: string; value: string };

/** Fonts offered in the editor. `value` is the CSS font-family stored in textConfig.font. */
export const BLITZ_FONTS: BlitzFont[] = loaded.map((f) => ({ label: f.label, value: `${f.family}, ${EMOJI_FALLBACK}` }));

export const BLITZ_DEFAULT_FONT = BLITZ_FONTS[0].value;

/**
 * Maps any stored font value to a bundled font. Older templates and projects used
 * system fonts (Arial, Impact, "sans-serif") that the worker does not have; those
 * fall back to the default so preview and render always match.
 */
export const resolveBlitzFont = (font: string | undefined): string => {
  if (!font) return BLITZ_DEFAULT_FONT;
  const first = font.split(',')[0].trim().replace(/['"]/g, '').toLowerCase();
  return BLITZ_FONTS.find((f) => f.label.toLowerCase() === first || f.value.split(',')[0].trim().replace(/['"]/g, '').toLowerCase() === first)?.value
    ?? BLITZ_DEFAULT_FONT;
};
