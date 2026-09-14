'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  getEffectiveMonthlyUsdCents,
  getTermPriceUsdCents,
  isPlanId,
  isSoloPlan,
  isTermMonths,
  plansForProduct,
  type TermMonths,
} from '../../../config/plans';
import { formatUsd } from '../../../lib/money';
import { CheckoutSheet, type CheckoutRequest } from '../../checkout/CheckoutSheet';
import { TermToggle } from '../../marketing/shared/PricingPreview';
import { AppButton } from '../../ui/AppButton';
import { StepCard } from './StepCard';
import type { StepProps } from './types';

export const PlanStep = ({ product, advance }: StepProps) => {
  const router = useRouter();
  const params = useSearchParams();
  const urlTerm = Number(params.get('term'));
  const urlPlan = params.get('plan') ?? '';
  const [term, setTerm] = useState<TermMonths>(isTermMonths(urlTerm) ? urlTerm : 3);
  const [request, setRequest] = useState<CheckoutRequest | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [paid, setPaid] = useState(false);
  const [requested, setRequested] = useState(false);

  const finish = async (welcome: boolean) => {
    setLeaving(true);
    await advance(6, { completed: true });
    router.push(welcome ? '/app?welcome=1' : '/app');
  };

  return (
    <StepCard
      title="Keep creating every month"
      sub="Prepaid by bank transfer. Nothing renews automatically."
      footer={<AppButton variant="ghost" loading={leaving} onClick={() => finish(false)}>Not now — go to my workspace</AppButton>}
    >
      <TermToggle value={term} onChange={setTerm} />
      <div className="grid gap-4 sm:grid-cols-2">
        {plansForProduct(product).filter(isSoloPlan).map((plan) => (
          <div key={plan.id} className={`flex flex-col gap-3 rounded-2xl border p-5 ${plan.id === urlPlan || (!isPlanId(urlPlan) && plan.mostPopular) ? 'border-app-accent ring-1 ring-app-accent' : 'border-app-line'}`}>
            <p className="text-[16px] font-semibold text-app-ink">{plan.name}</p>
            <p className="text-[30px] font-semibold tabular-nums text-app-ink">{formatUsd(getEffectiveMonthlyUsdCents(plan.id, term))}<span className="text-[14px] font-normal text-app-muted">/mo</span></p>
            <p className="text-[13px] text-app-muted">{plan.monthlyCredits} photos a month · {formatUsd(getTermPriceUsdCents(plan.id, term))} for {term} {term === 1 ? 'month' : 'months'}</p>
            <AppButton variant={plan.mostPopular ? 'primary' : 'secondary'} fullWidth onClick={() => setRequest({ purpose: 'subscription', planId: plan.id, termMonths: term })}>Choose {plan.name}</AppButton>
          </div>
        ))}
      </div>
      <CheckoutSheet
        request={request}
        onClose={() => {
          setRequest(null);
          if (paid) void finish(true);
          else if (requested) void finish(false);
        }}
        onPaid={() => setPaid(true)}
        onRequested={() => setRequested(true)}
      />
    </StepCard>
  );
};
