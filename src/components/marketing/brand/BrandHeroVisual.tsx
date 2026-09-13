import { BRAND } from '../../../content/business/marketing';
import { MarketingImage } from '../shared/MarketingImage';
import { PhoneFrame } from '../shared/PhoneFrame';

const GRID = [
  '/images/business/brand/themes/just-listed.png',
  '/images/business/brand/sets/modern-office.png',
  '/images/business/brand/themes/market-update.png',
  '/images/business/brand/sets/neighborhood-cafe.png',
  '/images/business/brand/themes/open-house.png',
  '/images/business/brand/sets/studio-backdrop.png',
  '/images/business/brand/themes/client-meeting.png',
  '/images/business/brand/sets/urban-outdoor.png',
  '/images/business/brand/themes/behind-the-scenes.png',
] as const;

/** Main portrait + a phone showing a month of posts. */
export const BrandHeroVisual = () => (
  <div className="relative mx-auto w-full max-w-md lg:max-w-none">
    <div className="relative aspect-[4/5] w-[78%] overflow-hidden rounded-3xl bg-app-sunken shadow-sm ring-1 ring-black/5 dark:ring-white/10">
      <MarketingImage src={BRAND.hero.image} sizes="(min-width: 1024px) 38vw, 78vw" priority caption="Sample made with Next5" />
    </div>
    <div className="absolute -bottom-6 right-0 w-[46%] sm:-bottom-8">
      <PhoneFrame>
        <div className="grid grid-cols-3 gap-0.5 pt-7">
          {GRID.map((src) => (
            <div key={src} className="relative aspect-square bg-app-sunken">
              <MarketingImage src={src} sizes="80px" />
            </div>
          ))}
        </div>
      </PhoneFrame>
    </div>
  </div>
);
