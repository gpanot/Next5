/**
 * The hook / CTA looks (first and last slide), in menu order: the Ideas deck's Hook button, the Blitz editor's
 * "Hook & CTA" panel and the slideshow editor all offer these. "Default": the hook looks like the other slides.
 * Plain data, so server code (slide render) and client code share it.
 */
export const HOOK_STYLE_IDS = ['default', 'white-box', 'tiktok-red'] as const;
export type HookStyleId = (typeof HOOK_STYLE_IDS)[number];

export const isHookStyleId = (v: unknown): v is HookStyleId => HOOK_STYLE_IDS.some((id) => id === v);
