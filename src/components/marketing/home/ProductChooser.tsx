import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { HOME_CHOOSER, STARTER, includesLine } from '../../../content/business/home';
import { MarketingImage } from '../shared/MarketingImage';

/** Two plan cards. Price and what is included come from the plan config, so they always match /pricing. */
export const ProductChooser = () => (
  <div className="grid gap-6 md:grid-cols-2">
    {HOME_CHOOSER.products.map((product) => (
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
          <h3 className="font-display text-[28px] font-medium leading-tight text-app-ink sm:text-[30px]">{product.title}</h3>
          <p className="text-[16px] leading-relaxed text-app-muted">{product.body}</p>
          <p className="rounded-xl bg-app-sunken px-3 py-2 text-[15px] text-app-ink">
            From <span className="font-semibold tabular-nums">{STARTER[product.planProduct].price}</span>/mo · {includesLine(product.planProduct)}
          </p>
          <span className="mt-auto flex items-center gap-1.5 pt-2 text-[15px] font-medium text-app-accent transition-colors duration-200 group-hover:text-app-ink">
            {product.cta} <ArrowRight aria-hidden className="h-4 w-4" />
          </span>
        </div>
      </Link>
    ))}
  </div>
);
