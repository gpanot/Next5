/**
 * The caption config of one slide: the slideshow's, with the hook / CTA look on its first and last slide.
 * Shared by the Remotion composition and every HTML preview (editor, deck cards, Approve), so they all match.
 */

import type { HookCtaStyle, TextConfig } from './types';

/** Fields of `HookCtaStyle`: anything else (position, business line) is never taken from it. */
export const HOOK_CTA_KEYS = ['font', 'fontSize', 'fontWeight', 'color', 'strokeWidth', 'strokeColor', 'textBackground', 'lineHighlight'] as const;

/**
 * Keeps only the style fields a hook / CTA may change. "No box" is stored as '' (not undefined), so it survives JSON
 * and still clears a box the other slides have.
 */
export const pickHookCtaStyle = (patch: Partial<TextConfig>): HookCtaStyle => {
  const out: Record<string, unknown> = {};
  for (const k of HOOK_CTA_KEYS) {
    if (!(k in patch)) continue;
    const v = patch[k];
    if (v !== undefined) out[k] = v;
    else if (k === 'textBackground') out[k] = '';
    else if (k === 'lineHighlight') out[k] = false;
  }
  return out as HookCtaStyle;
};

/** True for the hook (first) and the CTA (last) slide. */
export const isHookOrCta = (index: number, count: number) => index === 0 || index === count - 1;

export function slideTextConfig(config: TextConfig, index: number, count: number): TextConfig {
  const style = config.hookCtaStyle;
  if (!style || !isHookOrCta(index, count)) return config;
  const merged = { ...config, ...style };
  return merged.textBackground === '' ? { ...merged, textBackground: undefined } : merged;
}
