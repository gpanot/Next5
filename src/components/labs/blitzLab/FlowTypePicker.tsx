'use client';

import { Building2, Home, ShoppingBag, Store } from 'lucide-react';

export type FlowType = 'b2b' | 'b2b_manual' | 'real_estate' | 'tiktok_shop';

type FlowCard = {
  id: FlowType;
  icon: React.ReactNode;
  title: string;
  description: string;
  disabled?: boolean;
};

const FLOWS: FlowCard[] = [
  {
    id: 'b2b',
    icon: <Building2 className="h-6 w-6" />,
    title: 'B2B Website',
    description: 'Research viral TikTok content for any niche and build a slideshow from a website URL.',
  },
  {
    id: 'b2b_manual',
    icon: <Store className="h-6 w-6" />,
    title: 'B2B No Website',
    description: 'For small businesses with a weak site or none. Type the profile, add product photos, get a slideshow deck.',
  },
  {
    id: 'real_estate',
    icon: <Home className="h-6 w-6" />,
    title: 'Real Estate',
    description: 'Paste a Zillow link to scrape listing photos and generate a Hook → Meat → CTA slideshow.',
  },
  {
    id: 'tiktok_shop',
    icon: <ShoppingBag className="h-6 w-6" />,
    title: 'TikTok Shop',
    description: 'Coming soon — TikTok Shop product slideshow flow.',
    disabled: true,
  },
];

type Props = {
  onSelect: (type: FlowType) => void;
};

export function FlowTypePicker({ onSelect }: Props) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-[16px] font-semibold text-ink">Choose a flow</h2>
        <p className="mt-0.5 text-[13px] text-muted">Pick the type of slideshow you want to create.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FLOWS.map((flow) => (
          <button
            key={flow.id}
            type="button"
            disabled={flow.disabled}
            onClick={() => !flow.disabled && onSelect(flow.id)}
            className={[
              'flex flex-col gap-3 rounded-2xl border p-5 text-left transition-all duration-150',
              flow.disabled
                ? 'cursor-not-allowed border-line bg-surface-alt opacity-50'
                : 'border-line bg-white hover:border-ink hover:shadow-sm active:scale-[0.98]',
            ].join(' ')}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-alt text-ink">
              {flow.icon}
            </span>
            <div>
              <p className="text-[14px] font-semibold text-ink">{flow.title}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{flow.description}</p>
            </div>
            {flow.disabled && (
              <span className="self-start rounded-full bg-surface-alt px-2.5 py-0.5 text-[11px] font-medium text-muted">
                Coming soon
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
