import { FORMATS } from '../../../config/formats';
import { SHOP } from '../../../content/business/marketing';
import { MarketingImage } from '../shared/MarketingImage';
import { PhoneFrame } from '../shared/PhoneFrame';

/** Generic device frames — labels only, never a clone of a real platform's UI. */
export const MarketplaceFrames = () => (
  <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
    {SHOP.marketplaces.map((frame) => (
      <PhoneFrame key={frame.label} label={`${frame.label} · ${FORMATS[frame.format].ratio}`} className="mx-auto w-full max-w-[240px]">
        <div className="flex aspect-[9/19] flex-col justify-center bg-app-sunken pt-7">
          <div className="relative w-full" style={{ aspectRatio: FORMATS[frame.format].cssAspect }}>
            <MarketingImage src={frame.image} sizes="240px" />
          </div>
          <div className="space-y-1.5 p-3" aria-hidden>
            <div className="h-2 w-3/4 rounded-full bg-app-line" />
            <div className="h-2 w-1/2 rounded-full bg-app-line" />
          </div>
        </div>
      </PhoneFrame>
    ))}
  </div>
);
