/**
 * Blitz Lab caption fonts — static list, safe to import anywhere (no loading here).
 * The font files are loaded by fontLoader.ts, which only the composition imports,
 * so the browser preview and the headless worker draw the same glyphs.
 */

/** Emoji glyphs come from the system (Noto Color Emoji on the worker). */
const EMOJI_FALLBACK = "'Apple Color Emoji', 'Noto Color Emoji', 'Segoe UI Emoji', sans-serif";

/** Google Font family names. Keep in sync with fontLoader.ts. */
export const BLITZ_FONT_FAMILIES = ['Montserrat', 'Anton', 'Bebas Neue', 'Poppins', 'Oswald', 'Inter'] as const;

export type BlitzFont = { label: string; value: string };

/** Fonts offered in the editor. `value` is the CSS font-family stored in textConfig.font. */
export const BLITZ_FONTS: BlitzFont[] = BLITZ_FONT_FAMILIES.map((family) => ({
  label: family,
  value: `'${family}', ${EMOJI_FALLBACK}`,
}));

export const BLITZ_DEFAULT_FONT = BLITZ_FONTS[0].value;

const firstFamily = (font: string) => font.split(',')[0].trim().replace(/['"]/g, '').toLowerCase();

/**
 * Maps any stored font value to a bundled font. Older templates and projects used
 * system fonts (Arial, Impact, "sans-serif") that the worker does not have; those
 * fall back to the default so preview and render always match.
 */
export const resolveBlitzFont = (font: string | undefined): string => {
  if (!font) return BLITZ_DEFAULT_FONT;
  const wanted = firstFamily(font);
  return BLITZ_FONTS.find((f) => f.label.toLowerCase() === wanted)?.value ?? BLITZ_DEFAULT_FONT;
};
