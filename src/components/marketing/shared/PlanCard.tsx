import { Check } from 'lucide-react';
import {
  getEffectiveMonthlyUsdCents,
  getTermPriceUsdCents,
  getTermSavingsUsdCents,
  type Plan,
  type TermMonths,
} from '../../../config/plans';
import { formatUsd } from '../../../lib/money';
import { CtaLink } from './CtaLink';

type PlanCardProps = { plan: Plan; term: TermMonths };

export const PlanCard = ({ plan, term }: PlanCardProps) => {
  const monthly = getEffectiveMonthlyUsdCents(plan.id, term);
  const total = getTermPriceUsdCents(plan.id, term);
  const savings = getTermSavingsUsdCents(plan.id, term);
  const productLabel = plan.product === 'brand' ? 'Brand' : 'Shop';

  return (
    <article
      className={`relative flex flex-col gap-6 rounded-2xl border bg-app-panel p-6 shadow-sm sm:p-8 ${plan.mostPopular ? 'border-app-accent ring-1 ring-app-accent' : 'border-app-line'}`}
    >
      {plan.mostPopular && (
        <span className="label-caps absolute -top-3 left-6 rounded-full bg-app-accent px-3 py-1 text-[10px] font-semibold text-app-accent-ink">Most popular</span>
      )}
      <header>
        <p className="text-[14px] font-medium text-app-muted">{productLabel} {plan.name}</p>
        <p className="mt-2 flex items-baseline gap-1">
          <span className="text-[44px] font-semibold leading-none tabular-nums text-app-ink">{formatUsd(monthly)}</span>
          <span className="text-[15px] text-app-muted">/mo</span>
        </p>
        <p className="mt-2 min-h-5 text-[13px] text-app-muted">
          {term === 1 ? 'Billed monthly, prepaid' : `Billed ${formatUsd(total)} for ${term} months`}
          {savings > 0 && <span className="ml-1 font-medium text-app-success">· Save {formatUsd(savings)}</span>}
        </p>
        <p className="mt-3 text-[15px] text-app-ink">{plan.tagline}</p>
      </header>
      <ul className="flex flex-1 flex-col gap-2.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2.5 text-[14px] text-app-ink">
            <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" />
            {feature}
          </li>
        ))}
      </ul>
      <CtaLink href={`/start/${plan.product}?plan=${plan.id}&term=${term}`} variant={plan.mostPopular ? 'primary' : 'secondary'} className="w-full">
        Start free
      </CtaLink>
    </article>
  );
};
