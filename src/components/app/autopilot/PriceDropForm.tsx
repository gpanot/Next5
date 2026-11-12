'use client';

import { TrendingDown } from 'lucide-react';

export type PriceDraft = { newPrice: string; oldPrice: string };

type Props = { value: PriceDraft; onChange: (patch: Partial<PriceDraft>) => void };

const INPUT = 'h-11 w-full rounded-xl border border-app-line bg-app-panel pl-7 pr-3 text-[14px] text-app-ink tabular-nums transition-colors duration-200 focus:border-app-accent focus:outline-none';

/** "$425,000" or "425000" → 425000; NaN when empty. */
export const dollars = (text: string) => Number(text.replace(/[^0-9.]/g, '')) || NaN;

export const isPriceValid = (p: PriceDraft) => dollars(p.newPrice) > 0 && (!p.oldPrice || dollars(p.oldPrice) > dollars(p.newPrice));

const Money = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <label className="flex flex-col gap-1 text-[12px] text-app-muted">
    {label}
    <span className="relative flex items-center">
      <span className="pointer-events-none absolute left-3 text-[14px] text-app-muted">$</span>
      <input inputMode="numeric" placeholder="425,000" value={value} onChange={(e) => onChange(e.target.value)} className={INPUT} />
    </span>
  </label>
);

export const PriceDropForm = ({ value, onChange }: Props) => (
  <div className="flex flex-col gap-3 rounded-xl border border-app-line bg-app-panel p-4 shadow-sm">
    <p className="flex items-center gap-2 text-[14px] font-medium text-app-ink">
      <TrendingDown aria-hidden className="h-4 w-4 text-app-accent" /> What is the new price?
    </p>
    <div className="grid grid-cols-2 gap-2">
      <Money label="New price" value={value.newPrice} onChange={(newPrice) => onChange({ newPrice })} />
      <Money label="Was" value={value.oldPrice} onChange={(oldPrice) => onChange({ oldPrice })} />
    </div>
    {value.oldPrice && value.newPrice && !isPriceValid(value) && <p className="text-[12px] text-app-danger">The new price must be lower than the old one.</p>}
    <p className="text-[12px] text-app-muted">We update this home’s price, so the videos show the new one.</p>
  </div>
);
