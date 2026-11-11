/**
 * TikTok's UI over a 9:16 post, as a fraction of the frame: the search bar on top, the caption and progress bar at the
 * bottom, the profile / like / comment / save / share column on the right (from about 40% down to the bottom edge, measured
 * on a phone). Text in these bands gets covered.
 */
export const TIKTOK_SAFE_ZONE = { top: 0.13, bottom: 0.16, right: 0.16, rightFrom: 0.38 } as const;

/** How far slide text may reach into the right rail's box, as a share of that box's width. */
const RAIL_OVERLAP = 0.15;

/**
 * Slide text's side margin, both sides, as a share of the frame's width (13.6%, 147 px of 1080): the text block reaches
 * at most 15% into the right rail's box, and the left matches so the text stays centered.
 */
export const TEXT_SIDE = TIKTOK_SAFE_ZONE.right * (1 - RAIL_OVERLAP);
