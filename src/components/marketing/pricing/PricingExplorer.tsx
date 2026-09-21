'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { DEFAULT_TERM, plansForProduct, type ProductLineId, type TermMonths } from '../../../config/plans';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { PlanCard } from '../shared/PlanCard';
import { TermToggle } from '../shared/PricingPreview';
import { ComparisonTable } from './ComparisonTable';

const PRODUCT_OPTIONS = [
  { value: 'professionals', label: 'For realtors' },
  { value: 'shops', label: 'For TikTok Shop' },
] as const;

export const PricingExplorer = () => {
  const params = useSearchParams();
  const router = useRouter();
  const audience = params.get('for') === 'shops' ? 'shops' : 'professionals';
  const product: ProductLineId = audience === 'shops' ? 'shop' : 'brand';
  const [term, setTerm] = useState<TermMonths>(DEFAULT_TERM);

  const setAudience = (value: string) => router.replace(`/pricing?for=${value}`, { scroll: false });

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col items-center gap-4">
        <SegmentedControl options={PRODUCT_OPTIONS} value={audience} onChange={setAudience} />
        <TermToggle value={term} onChange={setTerm} />
      </div>
      <div className="mx-auto grid w-full max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plansForProduct(product).map((plan) => <PlanCard key={plan.id} plan={plan} term={term} />)}
      </div>
      <div className="mx-auto w-full max-w-4xl">
        <ComparisonTable product={product} />
      </div>
    </div>
  );
};
