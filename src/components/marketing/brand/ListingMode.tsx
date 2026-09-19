import { Check } from 'lucide-react';
import { BRAND } from '../../../content/business/marketing';
import { ImportSourcesRow } from '../offer/ImportSources';
import { MarketingImage } from '../shared/MarketingImage';

/** Realtor listing mode: paste a Zillow link, appear in the real rooms, post for every listing moment. */
export const ListingMode = () => (
  <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-app-sunken shadow-sm ring-1 ring-black/5 dark:ring-white/10">
      <MarketingImage src={BRAND.listings.image} sizes="(min-width: 768px) 45vw, 100vw" caption="Example photo" />
    </div>
    <div className="flex flex-col gap-5">
      <ImportSourcesRow sources={['zillow']} />
      <ul className="flex flex-col gap-3">
        {BRAND.listings.points.map((point) => (
          <li key={point} className="flex gap-3 text-[16px] text-app-ink sm:text-[17px]">
            <Check aria-hidden className="mt-1 h-4 w-4 shrink-0 text-app-accent" />
            {point}
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap gap-2" aria-label="Posts for every listing moment">
        {BRAND.listings.moments.map((moment) => (
          <li key={moment} className="rounded-full border border-app-line bg-app-panel px-3 py-1.5 text-[13px] font-medium text-app-ink">{moment}</li>
        ))}
      </ul>
    </div>
  </div>
);
