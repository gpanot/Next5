import { FORMATS, FORMAT_IDS } from '../../../config/formats';
import { BRAND } from '../../../content/business/marketing';
import { MarketingImage } from '../shared/MarketingImage';

const WIDTHS: Record<string, string> = {
  story_9_16: 'w-[22%]',
  portrait_4_5: 'w-[30%]',
  square_1_1: 'w-[34%]',
  portrait_3_4: 'w-[28%]',
};

/** The same sample in every format — generated natively per format in the product. */
export const FormatsShowcase = () => (
  <div className="flex flex-wrap items-end justify-center gap-4 sm:flex-nowrap sm:gap-6">
    {FORMAT_IDS.map((id) => (
      <figure key={id} className={`flex min-w-[140px] flex-col gap-2 ${WIDTHS[id]}`}>
        <div className="relative overflow-hidden rounded-xl bg-app-sunken ring-1 ring-black/5 dark:ring-white/10" style={{ aspectRatio: FORMATS[id].cssAspect }}>
          <MarketingImage src={BRAND.formatsImage} sizes="(min-width: 640px) 25vw, 45vw" />
        </div>
        <figcaption className="text-center">
          <span className="block text-[14px] font-semibold tabular-nums text-app-ink">{FORMATS[id].ratio}</span>
          <span className="block text-[12px] text-app-muted">{FORMATS[id].label}</span>
        </figcaption>
      </figure>
    ))}
  </div>
);
