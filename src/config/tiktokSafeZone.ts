/**
 * TikTok's UI over a 9:16 post, as a fraction of the frame: the search bar on top, the caption and progress bar at the
 * bottom, the like / comment / share column on the right (from about a third down). Text in these bands gets covered.
 */
export const TIKTOK_SAFE_ZONE = { top: 0.13, bottom: 0.16, right: 0.2, rightFrom: 0.35 } as const;
