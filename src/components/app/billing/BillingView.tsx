'use client';

import { useCallback, useState } from 'react';
import { TOPUPS, termLabel, topupList, type PlanId, type TermMonths } from '../../../config/plans';
import { useApi } from '../../../hooks/useApi';
import { formatShortDate } from '../../../lib/dates';
import { formatUsd } from '../../../lib/money';
import type { PaymentDto } from '../../../types/business/payments';
import { CheckoutSheet, type CheckoutRequest } from '../../checkout/CheckoutSheet';
import { PromiseCard } from '../promise/PromiseCard';
import { AppButton } from '../../ui/AppButton';
import { Card, CardBody } from '../../ui/Card';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonText } from '../../ui/Skeleton';
import { useWorkspace } from '../shell/WorkspaceProvider';
import { PaymentsTable } from './PaymentsTable';
import { PlanPicker } from './PlanPicker';

export const BillingView = () => {
  const { me, product, refresh } = useWorkspace();
  const payments = useApi<{ payments: PaymentDto[] }>(product ? `/api/app/payments?product=${product}` : null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [request, setRequest] = useState<CheckoutRequest | null>(null);
  const [resume, setResume] = useState<PaymentDto | null>(null);

  const onPaid = useCallback(() => {
    refresh();
    payments.refresh();
  }, [refresh, payments]);

  if (!me?.workspace || !product) return null;
  const sub = me.subscription;
  const choosePlan = (planId: PlanId, termMonths: TermMonths) => {
    setPickerOpen(false);
    setRequest({ purpose: 'subscription', planId, termMonths });
  };

  return (
    <>
      <Card>
        <CardBody className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label-caps text-[10px] font-medium text-app-muted">Current plan</p>
            <p className="mt-1 text-[22px] font-semibold text-app-ink">{sub ? `${sub.planName} · ${termLabel(sub.termMonths)}` : 'No plan'}</p>
            <p className="mt-1 text-[14px] text-app-muted">
              {sub?.startsAt && sub.endsAt ? `${formatShortDate(sub.startsAt)} → ${formatShortDate(sub.endsAt)}` : 'Pick a plan to get photos every month.'}
              {sub?.nextGrantAt ? ` · Next photos ${formatShortDate(sub.nextGrantAt)} (+${sub.monthlyCredits})` : ''}
            </p>
            {me.queuedRenewal?.startsAt && <p className="mt-1 text-[13px] text-app-success">Renewal paid — starts {formatShortDate(me.queuedRenewal.startsAt)}</p>}
          </div>
          <AppButton onClick={() => setPickerOpen(true)}>{sub ? 'Renew or change plan' : 'Choose a plan'}</AppButton>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[17px] font-semibold text-app-ink">{me.balance.total} photos available</p>
            <p className="text-[13px] text-app-muted">Plan {me.balance.plan} · Top-up {me.balance.topup + me.balance.bonus}{me.balance.trial ? ` · Free ${me.balance.trial}` : ''}</p>
          </div>
          {me.balance.nextExpiry && <p className="text-[13px] text-app-muted">{me.balance.nextExpiry.credits} photos expire on {formatShortDate(me.balance.nextExpiry.at)}.</p>}
          <div className="grid gap-3 sm:grid-cols-3">
            {topupList().map((t) => (
              <button key={t.id} type="button" onClick={() => setRequest({ purpose: 'topup', topupId: t.id, product })} className="flex items-center justify-between rounded-xl border border-app-line p-4 text-left transition-colors duration-200 hover:border-app-accent hover:bg-app-sunken">
                <span className="text-[14px] font-medium text-app-ink">{TOPUPS[t.id].credits} photos</span>
                <span className="text-[15px] font-semibold tabular-nums text-app-ink">{formatUsd(t.usdCents)}</span>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <PromiseCard product={product} />

      <section className="flex flex-col gap-3">
        <h2 className="text-[17px] font-semibold text-app-ink">Payments</h2>
        {payments.loading && <SkeletonText lines={3} />}
        {payments.error && <ErrorState message={payments.error} onRetry={payments.refresh} />}
        {payments.data && payments.data.payments.length === 0 && <EmptyState title="No payments yet" body="Your receipts will appear here." />}
        {payments.data && payments.data.payments.length > 0 && <PaymentsTable payments={payments.data.payments} onResume={setResume} />}
      </section>

      <PlanPicker open={pickerOpen} product={product} currentPlanId={sub?.planId ?? null} onClose={() => setPickerOpen(false)} onChoose={choosePlan} />
      <CheckoutSheet request={request} existingPayment={resume} onClose={() => { setRequest(null); setResume(null); payments.refresh(); }} onPaid={onPaid} />
    </>
  );
};
