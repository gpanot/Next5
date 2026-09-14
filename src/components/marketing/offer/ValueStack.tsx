import { Check } from 'lucide-react';
import type { StackItem } from '../../../content/business/offer';
import { CtaLink } from '../shared/CtaLink';

type ValueStackProps = { items: readonly StackItem[]; totalValue: string; priceLine: string; footnote: string; cta: { href: string; label: string } };

/** Hormozi-style value stack: what each part would cost elsewhere, the total, then the price. */
export const ValueStack = ({ items, totalValue, priceLine, footnote, cta }: ValueStackProps) => (
  <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-app-line bg-app-panel shadow-sm">
    <ul className="divide-y divide-app-line">
      {items.map((item) => (
        <li key={item.title} className="flex items-start gap-3 p-5 sm:p-6">
          <Check aria-hidden className="mt-1 h-5 w-5 shrink-0 text-app-accent" />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-semibold text-app-ink">{item.title}</p>
            <p className="mt-0.5 text-[14px] text-app-muted">{item.body}</p>
          </div>
          <p className="shrink-0 text-right text-[14px] text-app-muted">
            <span className="block text-[11px] uppercase tracking-wide">Worth</span>
            <span className="text-[16px] font-medium tabular-nums text-app-ink line-through decoration-app-muted/60">{item.value}</span>
          </p>
        </li>
      ))}
    </ul>
    <div className="flex flex-col items-start gap-4 bg-app-sunken p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <p className="text-[14px] text-app-muted">Total value <span className="font-semibold tabular-nums text-app-ink line-through decoration-app-muted/60">{totalValue}</span> a month</p>
        <p className="font-serif text-[32px] font-medium leading-tight text-app-ink">{priceLine}</p>
      </div>
      <CtaLink href={cta.href} className="w-full sm:w-auto">{cta.label}</CtaLink>
    </div>
    <p className="px-5 pb-5 pt-3 text-[12px] text-app-muted sm:px-6">{footnote}</p>
  </div>
);
