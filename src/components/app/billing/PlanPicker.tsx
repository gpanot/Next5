'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';
import {
  getEffectiveMonthlyUsdCents,
  getTermPriceUsdCents,
  getTermSavingsUsdCents,
  plansForProduct,
  type PlanId,
  type TermMonths,
} from '../../../config/plans';
import { formatUsd } from '../../../lib/money';
import { AppButton } from '../../ui/AppButton';
import { Sheet } from '../../ui/Sheet';
import { TermToggle } from '../../marketing/shared/PricingPreview';

type PlanPickerProps = {
  open: boolean;
  product: 'brand' | 'shop';
  currentPlanId: string | null;
  onClose: () => void;
  onChoose: (planId: PlanId, term: TermMonths) => void;
};

export const PlanPicker = ({ open, product, currentPlanId, onClose, onChoose }: PlanPickerProps) => {
  const [term, setTerm] = useState<TermMonths>(3);
  return (
    <Sheet open={open} onClose={onClose} title="Choose a plan" side="bottom" className="sm:left-1/2 sm:max-w-2xl sm:-translate-x-1/2">
      <div className="flex flex-col gap-5 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px] font-semibold text-app-ink">Choose a plan</p>
          <TermToggle value={term} onChange={setTerm} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {plansForProduct(product).map((plan) => {
            const savings = getTermSavingsUsdCents(plan.id, term);
            const isCurrent = plan.id === currentPlanId;
            return (
              <div key={plan.id} className={`flex flex-col gap-3 rounded-2xl border p-5 ${plan.mostPopular ? 'border-app-accent' : 'border-app-line'}`}>
                <div className="flex items-baseline justify-between">
                  <p className="text-[16px] font-semibold text-app-ink">{plan.name}</p>
                  {isCurrent && <span className="text-[12px] text-app-muted">Current plan</span>}
                </div>
                <p className="text-[28px] font-semibold tabular-nums text-app-ink">{formatUsd(getEffectiveMonthlyUsdCents(plan.id, term))}<span className="text-[14px] font-normal text-app-muted">/mo</span></p>
                <p className="text-[13px] text-app-muted">{formatUsd(getTermPriceUsdCents(plan.id, term))} for {term} {term === 1 ? 'month' : 'months'}{savings > 0 ? ` · save ${formatUsd(savings)}` : ''}</p>
                <ul className="flex flex-col gap-1.5 text-[13px] text-app-ink">
                  {plan.features.map((f) => <li key={f} className="flex gap-2"><Check aria-hidden className="mt-0.5 h-3.5 w-3.5 text-app-accent" />{f}</li>)}
                </ul>
                <AppButton variant={plan.mostPopular ? 'primary' : 'secondary'} fullWidth onClick={() => onChoose(plan.id, term)}>
                  {isCurrent ? `Renew for ${formatUsd(getTermPriceUsdCents(plan.id, term))}` : `Choose ${plan.name}`}
                </AppButton>
              </div>
            );
          })}
        </div>
        <p className="text-[12px] text-app-muted">Same plan: your renewal starts when your current plan ends. Different plan: it starts right away and replaces the current one (no proration). Your remaining photos this month stay until they expire.</p>
      </div>
    </Sheet>
  );
};
