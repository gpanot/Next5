/**
 * Official Zillow and TikTok marks (paths from Simple Icons, CC0), used to say "works with" — nominative use,
 * no endorsement implied. Brand colors: Zillow Blue #006AFF; TikTok cyan #25F4EE and red #FE2C55.
 */

const ZILLOW_MARK =
  'M12.006 0L1.086 8.627v3.868c3.386-2.013 11.219-5.13 14.763-6.015.11-.024.16.005.227.078.372.427 1.586 1.899 1.916 2.301a.128.128 0 0 1-.03.195 43.607 43.607 0 0 0-6.67 6.527c-.03.037-.006.043.012.03 2.642-1.134 8.828-2.94 11.622-3.452V8.627zm-.48 11.177c-2.136.708-8.195 3.307-10.452 4.576V24h21.852v-7.936c-2.99.506-11.902 3.16-15.959 5.246a.183.183 0 0 1-.23-.036l-2.044-2.429c-.055-.061-.062-.098.011-.208 1.574-2.3 4.789-5.899 6.833-7.418.042-.03.031-.06-.012-.042Z';

export const TIKTOK_MARK =
  'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z';

type LogoProps = { className?: string };

/** Zillow mark + wordmark in Zillow Blue. */
export const ZillowLogo = ({ className = '' }: LogoProps) => (
  <span className={`inline-flex items-center gap-1.5 text-[#006AFF] ${className}`}>
    <svg viewBox="0 0 24 24" aria-hidden className="h-[1.15em] w-[1.15em]">
      <path d={ZILLOW_MARK} fill="currentColor" />
    </svg>
    <span className="font-bold tracking-[-0.02em]">Zillow</span>
  </span>
);

/** TikTok note with its cyan and red edges. The top layer follows the text color, so it turns white in dark mode. */
export const TikTokMark = ({ className = '' }: LogoProps) => (
  <svg viewBox="-1.5 -1 27 26" aria-hidden className={className}>
    <path d={TIKTOK_MARK} fill="#25F4EE" transform="translate(-0.7 -0.6)" />
    <path d={TIKTOK_MARK} fill="#FE2C55" transform="translate(0.7 0.6)" />
    <path d={TIKTOK_MARK} fill="currentColor" />
  </svg>
);

/** TikTok mark + wordmark ("TikTok Shop" when `shop`). */
export const TikTokLogo = ({ className = '', shop = false }: LogoProps & { shop?: boolean }) => (
  <span className={`inline-flex items-center gap-1.5 text-app-ink ${className}`}>
    <TikTokMark className="h-[1.2em] w-[1.2em]" />
    <span className="font-bold tracking-[-0.02em]">{shop ? 'TikTok Shop' : 'TikTok'}</span>
  </span>
);
