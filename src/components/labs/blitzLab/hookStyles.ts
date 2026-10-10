import { HOOK_CTA_KEYS, pickHookCtaStyle } from '../../../remotion/slideTextConfig';
import type { HookCtaStyle } from '../../../remotion/types';
import { HOOK_STYLE_IDS, type HookStyleId } from '../../../types/hookStyle';
import { CAPTION_STYLES, type CaptionStyleDef } from './captionStyles';

export { isHookStyleId, type HookStyleId } from '../../../types/hookStyle';

const LABELS: Record<HookStyleId, string> = { default: 'Default', 'white-box': 'White box', 'tiktok-red': 'TikTok Red' };

/** The hook / CTA looks with their caption style (TextConfig patch and thumbnail). Add an id in types/hookStyle.ts. */
export type HookStyleDef = CaptionStyleDef & { id: HookStyleId };

export const HOOK_STYLES: HookStyleDef[] = HOOK_STYLE_IDS.map((id) => {
  const style = CAPTION_STYLES.find((s) => s.id === id)!;
  return { ...style, id, label: LABELS[id] };
});

/** The hook / CTA look sent with the caption: none for "Default", so they match the other slides. */
export const hookCtaOf = (id: HookStyleId): HookCtaStyle | undefined => {
  if (id === 'default') return undefined;
  return pickHookCtaStyle(HOOK_STYLES.find((s) => s.id === id)!.patch);
};

const isEmpty = (style?: HookCtaStyle) => !style || Object.keys(style).length === 0;

/** Which look a stored hook / CTA style is: "default" when it has none, null when it was tuned by hand. */
export const hookStyleIdOf = (own?: HookCtaStyle): HookStyleId | null => {
  if (isEmpty(own)) return 'default';
  const match = HOOK_STYLES.find((s) => {
    const look = hookCtaOf(s.id);
    return look !== undefined && HOOK_CTA_KEYS.every((k) => (look[k] ?? null) === (own![k] ?? null));
  });
  return match?.id ?? null;
};
