/**
 * Where a slide's text sits, moved by hand in the editors: `x` is the center of the text block, `y` its top, as shares
 * (0-1) of the slide's width and height. Plain data, so the slide render and the editors share it.
 */
export type TextAt = { x: number; y: number };

const share = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;

export const isTextAt = (v: unknown): v is TextAt => typeof v === 'object' && v !== null && share((v as TextAt).x) && share((v as TextAt).y);

/** A position a client sent, rounded to 0.1%; undefined when it is not one. */
export const parseTextAt = (v: unknown): TextAt | undefined =>
  isTextAt(v) ? { x: Math.round(v.x * 1000) / 1000, y: Math.round(v.y * 1000) / 1000 } : undefined;

/** The drafts' usual spot before the text is moved: centered, a third of the way down (the render's home, roughly). */
export const HOME_TEXT_AT: TextAt = { x: 0.5, y: 0.33 };

/** The slideshow editor's text styles, for the headline and the line under it alike, in menu order. */
export const SLIDE_LOOKS = ['tiktok-default', 'black-box', 'white-box', 'tiktok-red', 'all-caps'] as const;
export type SlideLook = (typeof SLIDE_LOOKS)[number];
export const SLIDE_LOOK_LABELS: Record<SlideLook, string> = { 'tiktok-default': 'TikTok default', 'black-box': 'Black box', 'white-box': 'White box', 'tiktok-red': 'TikTok Red', 'all-caps': 'All caps' };

/** A stored look: one of the four, or 'default' (unset on older slides and in campaigns: the slide's usual look). */
export type TextLook = SlideLook | 'default';
export const isSlideLook = (v: unknown): v is SlideLook => SLIDE_LOOKS.some((id) => id === v);

/**
 * How a headline is drawn. 'default' is the outlined TikTok text on hooks and the brand's box elsewhere (the box the
 * menu calls Black box, as brands' boxes mostly are).
 */
export type TitleKind = 'outline' | 'brand-box' | 'black-box' | 'white-box' | 'tiktok-red' | 'all-caps';
export const titleKind = (role: string, look: TextLook | undefined): TitleKind => {
  if (look === 'tiktok-default') return 'outline';
  if (!look || look === 'default') return role === 'hook' ? 'outline' : 'brand-box';
  return look;
};

/** How the line under the headline is drawn: 'plain' is TikTok's white text. 'all-caps': white italic capitals
 *  (Montserrat ExtraBold Italic) with a soft shadow, as many golf and fitness creators use. */
export type BodyKind = 'plain' | 'black-box' | 'white-box' | 'tiktok-red' | 'all-caps';
export const bodyKind = (look: TextLook | undefined): BodyKind => (!look || look === 'default' || look === 'tiktok-default' ? 'plain' : look);

/** The menu pick a stored look shows as. */
export const titlePick = (role: string, look: TextLook | undefined): SlideLook => {
  const kind = titleKind(role, look);
  return kind === 'outline' ? 'tiktok-default' : kind === 'brand-box' ? 'black-box' : kind;
};
export const bodyPick = (look: TextLook | undefined): SlideLook => {
  const kind = bodyKind(look);
  return kind === 'plain' ? 'tiktok-default' : kind;
};
