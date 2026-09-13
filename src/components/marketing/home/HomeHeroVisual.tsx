import { HOME } from '../../../content/business/marketing';
import { MarketingImage } from '../shared/MarketingImage';

export const HomeHeroVisual = () => (
  <div className="grid grid-cols-2 gap-4">
    {HOME.hero.images.map((src, index) => (
      <div key={src} className={`relative aspect-[4/5] overflow-hidden rounded-3xl bg-app-sunken shadow-sm ring-1 ring-black/5 dark:ring-white/10 ${index === 1 ? 'mt-12' : ''}`}>
        <MarketingImage src={src} sizes="(min-width: 1024px) 22vw, 45vw" priority caption={index === 0 ? 'Brand Studio' : 'Shop Studio'} />
      </div>
    ))}
  </div>
);
