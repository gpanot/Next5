/**
 * TikTok UGC videos shown on the marketing pages. Paste the TikTok link of each video our team made,
 * e.g. "https://www.tiktok.com/@next5.realtor/video/7412345678901234567". Short links (vm.tiktok.com)
 * work too. The page reads the cover and author from TikTok and plays the video in place on tap.
 *
 * Only list videos Next5 made (or has the rights to show). Never a stranger's video.
 * When a list is empty, the page falls back to the poster mocks in ./ugc.ts.
 */

export type UgcAudience = 'realtor' | 'shop';

export type TikTokClip = {
  url: string;
  /** Short label on the card, e.g. "Just listed tour" or "Linen set try-on". */
  label: string;
};

export const TIKTOK_UGC: Record<UgcAudience, readonly TikTokClip[]> = {
  realtor: [
    { url: 'https://www.tiktok.com/@lisaduboisrealestate/video/7469845938744331562', label: 'Hide and seek home tour' },
  ],
  shop: [
    { url: 'https://www.tiktok.com/@prettypickedd/video/7670668920876961037', label: 'Leggings try-on' },
  ],
};

export const UGC_WALL = {
  eyebrow: 'UGC that works',
  title: 'Real UGC that works on TikTok. We make videos like these for you.',
  sub: 'Tap a video to play it. Each month, our team makes videos in this style for your page.',
  /** Shown under the strip: the examples are creator videos, not Next5 work. */
  credit: 'Example videos from real creators on TikTok. Yours are made by our team, in this style.',
  tabs: { realtor: 'Realtors', shop: 'TikTok Shop' } satisfies Record<UgcAudience, string>,
};
