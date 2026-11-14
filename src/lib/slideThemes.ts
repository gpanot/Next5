/**
 * The looks a realtor slideshow can take (playbook posts and "Slideshows of this home"). Plain data, so the pickers and
 * the render share it. Each theme draws full-bleed listing photos except Classic, the older framed look.
 */
export const SLIDE_THEMES = ['editorial', 'color-band', 'paper-card', 'big-number', 'poster', 'glass', 'classic'] as const;
export type SlideTheme = (typeof SLIDE_THEMES)[number];

export const DEFAULT_SLIDE_THEME: SlideTheme = 'editorial';

export const SLIDE_THEME_INFO: Record<SlideTheme, { name: string; line: string }> = {
  editorial: { name: 'Editorial', line: 'Serif title on a soft dark fade' },
  'color-band': { name: 'Color band', line: 'Cream band on top, photo below' },
  'paper-card': { name: 'Paper card', line: 'Dark text on a white note' },
  'big-number': { name: 'Big number', line: 'Yellow 01, 02, 03 per room' },
  poster: { name: 'Poster', line: 'Tall capitals, one word in yellow' },
  glass: { name: 'Glass', line: 'Dark panel with a progress bar' },
  classic: { name: 'Classic', line: 'Whole photo framed, text on top' },
};

export const isSlideTheme = (v: unknown): v is SlideTheme => SLIDE_THEMES.some((t) => t === v);

/** A stored theme, or the default when unset or unknown. */
export const slideThemeOf = (v: unknown): SlideTheme => (isSlideTheme(v) ? v : DEFAULT_SLIDE_THEME);
