'use client';

import Link from 'next/link';
import { useState } from 'react';
import { TERMS, plansForProduct, type ProductLineId, type TermMonths } from '../../../config/plans';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { PlanCard } from './PlanCard';

const TERM_OPTIONS = TERMS.map((t) => ({ value: String(t), label: t === 1 ? 'Monthly' : `${t} mo · −${t === 3 ? 10 : 20}%` }));

export const TermToggle = ({ value, onChange }: { value: TermMonths; onChange: (term: TermMonths) => void }) => (
  <SegmentedControl options={TERM_OPTIONS} value={String(value)} onChange={(v) => onChange(Number(v) as TermMonths)} />
);

export const PricingPreview = ({ product }: { product: ProductLineId }) => {
  const [term, setTerm] = useState<TermMonths>(3);
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <TermToggle value={term} onChange={setTerm} />
        <Link href={`/pricing?for=${product === 'brand' ? 'professionals' : 'shops'}`} className="text-[14px] font-medium text-app-accent transition-colors duration-200 hover:text-app-ink">
          Compare plans and extra photos →
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plansForProduct(product).map((plan) => <PlanCard key={plan.id} plan={plan} term={term} />)}
      </div>
    </div>
  );
};
