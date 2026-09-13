import { SHOP_TEMPLATES } from '../../../content/business/catalog/templates';
import { MarketingImage } from '../shared/MarketingImage';

export const LooksGallery = () => (
  <ul className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
    {SHOP_TEMPLATES.map((template) => (
      <li key={template.id} className="group flex flex-col gap-3">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-app-sunken ring-1 ring-black/5 dark:ring-white/10">
          <MarketingImage src={template.coverImage} sizes="(min-width: 1024px) 30vw, 45vw" className="transition-transform duration-500 group-hover:scale-[1.03]" caption={`Look · ${template.name}`} />
        </div>
        <div>
          <h3 className="text-[16px] font-semibold text-app-ink">{template.name}</h3>
          <p className="mt-0.5 text-[14px] text-app-muted">{template.description}</p>
        </div>
      </li>
    ))}
  </ul>
);
