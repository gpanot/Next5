import { HOME } from '../../../content/business/marketing';
import { MarketingImage } from '../shared/MarketingImage';

/** Hero proof: a Brand sample, and a real Shop result with the product photo it was made from. */
export const HomeHeroVisual = () => (
  <div className="grid grid-cols-2 gap-4">
    <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-app-sunken shadow-sm ring-1 ring-black/5 dark:ring-white/10">
      <MarketingImage src={HOME.hero.brandImage} sizes="(min-width: 1024px) 22vw, 45vw" priority caption="Brand Studio" />
    </div>
    <div className="relative mt-12">
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-app-sunken shadow-sm ring-1 ring-black/5 dark:ring-white/10">
        <MarketingImage src={HOME.hero.shopAfter} sizes="(min-width: 1024px) 22vw, 45vw" priority caption="Shop Studio · After" />
      </div>
      <figure className="absolute -left-3 -top-8 w-[42%] rotate-[-4deg] rounded-xl bg-white p-1.5 shadow-md ring-1 ring-black/5 sm:-left-6">
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-app-sunken">
          <MarketingImage src={HOME.hero.shopBefore} sizes="120px" alt="The product photo the shop sent" />
        </div>
        <figcaption className="label-caps pt-1 text-center text-[8.5px] font-medium text-[#6b625a]">Before</figcaption>
      </figure>
    </div>
  </div>
);
