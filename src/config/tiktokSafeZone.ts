/**
 * TikTok's UI over a 9:16 post, as a fraction of the frame: the search bar on top, the caption and progress bar at the
 * bottom, the profile / like / comment / save / share column on the right (from about 40% down to the bottom edge, measured
 * on a phone). Text in these bands gets covered.
 */
export const TIKTOK_SAFE_ZONE = { top: 0.13, bottom: 0.16, right: 0.16, rightFrom: 0.38 } as const;
