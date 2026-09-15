'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';
import { BRAND } from '../../../content/business/marketing';
import { Tabs } from '../../ui/Tabs';
import { MarketingImage } from '../shared/MarketingImage';

export const IndustryTabs = () => {
  const [active, setActive] = useState<string>(BRAND.industries[0].id);
  const industry = BRAND.industries.find((i) => i.id === active) ?? BRAND.industries[0];

  return (
    <div className="flex flex-col gap-8">
      <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <Tabs tabs={BRAND.industries.map((i) => ({ value: i.id, label: i.label }))} value={active} onChange={setActive} className="w-max min-w-full" />
      </div>
      <div role="tabpanel" className="grid items-center gap-8 md:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-app-sunken ring-1 ring-black/5 dark:ring-white/10">
          <MarketingImage key={industry.image} src={industry.image} sizes="(min-width: 768px) 45vw, 100vw" className="animate-fade-in" />
        </div>
        <div>
          <h3 className="font-display text-[30px] font-medium text-app-ink">{industry.label}</h3>
          <ul className="mt-5 flex flex-col gap-3">
            {industry.points.map((point) => (
              <li key={point} className="flex gap-3 text-[16px] text-app-ink">
                <Check aria-hidden className="mt-1 h-4 w-4 shrink-0 text-app-accent" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
