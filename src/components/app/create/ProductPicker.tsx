'use client';

import { Check } from 'lucide-react';
import { AppLink as Link } from '../shell/AppLink';
import type { ProductDto } from '../../../types/business/products';
import { Switch } from '../../ui/Switch';

type ProductPickerProps = {
  products: readonly ProductDto[];
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onlyNew: boolean;
  onOnlyNew: (on: boolean) => void;
};

export const ProductPicker = ({ products, selected, onToggle, onlyNew, onOnlyNew }: ProductPickerProps) => {
  const visible = products.filter((p) => !onlyNew || !p.lastUsedAt || selected.has(p.id));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Switch checked={onlyNew} onChange={onOnlyNew} label="Not photographed yet" />
        <span className="text-[13px] text-app-muted">{selected.size} selected · <Link href="/app/products" className="text-app-accent hover:text-app-ink">Add products</Link></span>
      </div>
      {visible.length === 0 ? (
        <p className="rounded-xl bg-app-sunken p-4 text-[14px] text-app-muted">{onlyNew ? 'Every product has photos. Turn off the filter to photograph them again.' : 'No products yet.'}</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-8">
          {visible.map((p) => {
            const on = selected.has(p.id);
            return (
              <button key={p.id} type="button" aria-pressed={on} onClick={() => onToggle(p.id)} className={`flex flex-col gap-1 rounded-xl p-1 text-left transition-colors duration-200 ${on ? 'bg-app-accent-soft' : 'hover:bg-app-sunken'}`}>
                <span className={`relative block aspect-[9/16] overflow-hidden rounded-lg bg-app-sunken ring-2 ${on ? 'ring-app-accent' : 'ring-transparent'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
                  {p.frontUrl && <img src={p.frontUrl} alt={p.name} className="h-full w-full object-cover" loading="lazy" />}
                  {on && <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-app-cta text-app-cta-ink"><Check aria-hidden className="h-3.5 w-3.5" /></span>}
                </span>
                <span className="truncate px-0.5 text-[12px] text-app-ink">{p.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
