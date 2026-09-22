import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { HOME_CHOOSER } from '../../../content/business/home';
import { AnimateIn } from '../../ui/AnimateIn';
import { MarketingImage } from '../shared/MarketingImage';

/**
 * Two plan cards. Price and what is included come from the plan config, so they always match /pricing.
 * Phones get a short side-by-side card (photo left, price right); bigger screens get the full card.
 */
export const ProductChooser = () => (
  <div className="grid gap-3 sm:gap-6 md:grid-cols-2">
    {HOME_CHOOSER.products.map((product, index) => (
      <AnimateIn key={product.href} delay={index * 150}>
        <Link
          href={product.href}
          className="group flex h-full overflow-hidden rounded-2xl border border-app-line bg-app-panel shadow-sm transition-shadow duration-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent sm:flex-col sm:rounded-3xl"
        >
          <div className="relative w-28 shrink-0 overflow-hidden bg-app-sunken sm:aspect-[4/3] sm:w-auto">
            <MarketingImage src={product.image} sizes="(min-width: 768px) 45vw, 112px" className="object-[center_22%] transition-transform duration-500 group-hover:scale-[1.03]" />
          </div>
          <div className="flex flex-1 flex-col gap-1.5 p-4 sm:gap-3 sm:p-8">
            <p className="label-caps text-[10px] font-medium text-app-accent">{product.eyebrow}</p>
            <h3 className="font-display text-[19px] font-medium leading-tight text-app-ink sm:text-[30px]">{product.title}</h3>
            <p className="hidden text-[16px] leading-relaxed text-app-muted sm:block">{product.body}</p>
            <p className="text-[13px] text-app-ink sm:rounded-xl sm:bg-app-sunken sm:px-3 sm:py-2 sm:text-[15px]">
              {product.includesLabel}
            </p>
            <span className="mt-auto flex items-center gap-1.5 pt-1 text-[14px] font-medium text-app-accent transition-colors duration-200 group-hover:text-app-ink sm:pt-2 sm:text-[15px]">
              {product.cta} <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>
      </AnimateIn>
    ))}
  </div>
);
