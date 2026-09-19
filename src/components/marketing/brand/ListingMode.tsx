import { Check } from 'lucide-react';
import { BRAND } from '../../../content/business/marketing';
import { ImportSourcesRow } from '../offer/ImportSources';
import { BeforeAfterSlider } from '../shop/BeforeAfterSlider';

/** Realtor listing mode: the listing photo in, the same room with her in it out. Then the rules and the moments. */
export const ListingMode = () => (
  <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
    <div className="mx-auto w-full max-w-md">
      <BeforeAfterSlider samples={BRAND.listings.slider} beforeLabel="Listing photo" ariaLabel="Compare the listing photo and the same room with the agent in it" />
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
