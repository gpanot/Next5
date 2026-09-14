import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { plansForProduct } from '../../../config/plans';
import { HOME } from '../../../content/business/marketing';
import { formatUsd } from '../../../lib/money';
import { MarketingImage } from '../shared/MarketingImage';

export const ProductChooser = () => (
  <div className="grid gap-6 md:grid-cols-2">
    {HOME.products.map((product) => {
      const from = Math.min(...plansForProduct(product.planProduct).map((p) => p.monthlyUsdCents));
      return (
        <Link
          key={product.href}
          href={product.href}
          className="group flex flex-col overflow-hidden rounded-3xl border border-app-line bg-app-panel shadow-sm transition-shadow duration-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-app-sunken">
            <MarketingImage src={product.image} sizes="(min-width: 768px) 45vw, 100vw" className="object-[center_22%] transition-transform duration-500 group-hover:scale-[1.03]" />
          </div>
          <div className="flex flex-1 flex-col gap-3 p-6 sm:p-8">
            <p className="label-caps text-[10px] font-medium text-app-accent">{product.eyebrow}</p>
            <h3 className="font-serif text-[30px] font-medium leading-tight text-app-ink">{product.title}</h3>
            <p className="text-[15px] leading-relaxed text-app-muted">{product.body}</p>
            <div className="mt-auto flex items-center justify-between pt-4">
              <span className="text-[14px] text-app-muted">From <span className="font-semibold tabular-nums text-app-ink">{formatUsd(from)}</span>/mo</span>
              <span className="flex items-center gap-1.5 text-[14px] font-medium text-app-ink transition-colors duration-200 group-hover:text-app-accent">
                {product.cta} <ArrowRight aria-hidden className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Link>
      );
    })}
  </div>
);
