import { TIKTOK_UGC, UGC_WALL, type UgcAudience } from '../../../content/business/tiktokUgc';
import { UGC } from '../../../content/business/ugc';
import { resolveTikToks, tiktokPlayerUrl } from '../../../lib/tiktok';
import { UgcVideoMock } from '../offer/UgcVideoMock';
import { RealtorUgcDemo } from './RealtorUgcDemo';
import { TikTokCard } from './TikTokCard';
import { UgcWallTabs } from './UgcWallTabs';

const FALLBACK = { realtor: UGC.brand.video, shop: UGC.shop.video } as const;

/** Horizontal, swipeable strip of TikToks for one audience. Falls back to the poster mock when no links are set. */
const UgcStrip = async ({ audience }: { audience: UgcAudience }) => {
  const videos = await resolveTikToks(TIKTOK_UGC[audience]);
  if (videos.length === 0) return <UgcVideoMock video={FALLBACK[audience]} />;
  return (
    <div className="flex flex-col gap-3">
      <ul className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:-mx-8 sm:gap-4 sm:px-8 lg:mx-0 lg:px-0" aria-label="UGC videos. Swipe to see more.">
        {videos.map((v) => (
          <li key={v.id} className="contents">
            <TikTokCard {...v} playerUrl={tiktokPlayerUrl(v.id)} />
          </li>
        ))}
      </ul>
      <p className="text-[13px] text-app-muted">{UGC_WALL.credit}</p>
    </div>
  );
};

/**
 * Both audiences with a switch (home page).
 * Realtors get the full transformation demo (viral TikTok → cloned video).
 * TikTok Shop keeps the standard scrollable strip.
 */
export const UgcWall = () => (
  <UgcWallTabs tabs={UGC_WALL.tabs} panels={{ realtor: <RealtorUgcDemo />, shop: <UgcStrip audience="shop" /> }} />
);

/** One audience only (/brand, /shop). */
export const UgcWallFor = ({ audience }: { audience: UgcAudience }) => <UgcStrip audience={audience} />;
