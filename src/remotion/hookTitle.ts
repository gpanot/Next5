/**
 * The hook title (2026-10-20): the card's written hook, fixed on screen like a TikTok title while the narrated captions
 * run under it. It shows for the hook slide and HOOK_TITLE_CARRY_S of the next. Its look is picked per card
 * (server/labs/hookTitle.ts). Shared by the render (HookTitleLayer.tsx) and the deck card preview (DeckHookTitle.tsx).
 */

import { BLITZ_FONTS } from './fonts';
import type { HookTitle, TextConfig } from './types';
import type { HookTitleStyleId } from '../types/hookStyle';

/** Seconds the title stays on into the slide after the hook. */
export const HOOK_TITLE_CARRY_S = 1;

const font = (family: string) => BLITZ_FONTS.find((f) => f.label === family)?.value ?? BLITZ_FONTS[0].value;

/** Same as the editor's "White box" and "TikTok Red" caption styles (components/labs/blitzLab/captionStyles.tsx). */
export const HOOK_TITLE_LOOKS: Record<HookTitleStyleId, Partial<TextConfig>> = {
  'tiktok-red': { font: font('TikTok Sans'), fontSize: 60, color: '#ffffff', fontWeight: 600, strokeWidth: 0, textBackground: '#E8453C', lineHighlight: true },
  'white-box': { font: font('Inter'), fontSize: 64, color: '#111111', fontWeight: 700, strokeWidth: 0, textBackground: 'rgba(255,255,255,0.95)', lineHighlight: false },
};

/** The config the title draws with: the slideshow's, in the title's look, at the title's height, centred. */
export function hookTitleConfig(config: TextConfig, title: HookTitle): TextConfig {
  const base: TextConfig = { ...config, ...HOOK_TITLE_LOOKS[title.style], positionY: title.positionY, offsetX: 0 };
  delete base.hookCtaStyle;
  delete base.hookTitle;
  return base;
}

/** A card's title in the look picked on the deck (`style`), else in its own look. */
export const titleInStyle = (title: HookTitle | undefined, style?: HookTitleStyleId | null): HookTitle | undefined =>
  (title && style ? { ...title, style } : title);

/** The title, when the config carries one with text. */
export const hookTitleOf = (config: TextConfig | undefined): HookTitle | null =>
  config?.hookTitle?.text.trim() ? config.hookTitle : null;
