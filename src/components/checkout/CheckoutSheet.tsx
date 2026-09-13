'use client';

import { track } from '../../lib/analytics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getTermSavingsUsdCents, isPlanId, isTermMonths, TOPUPS, isTopupId } from '../../config/plans';
import { usePaymentStatus } from '../../hooks/usePaymentStatus';
import { ApiError, apiFetch } from '../../lib/apiClient';
import { formatVnd } from '../../lib/money';
import type { CreatePaymentBody, PaymentDto } from '../../types/business/payments';
import { AppButton } from '../ui/AppButton';
import { ErrorState } from '../ui/ErrorState';
import { Sheet } from '../ui/Sheet';
import { SkeletonText } from '../ui/Skeleton';
import { CheckoutSummary, PaidStatus, QrAndBank, RequestReceived, WaitingStatus } from './CheckoutParts';

export type CheckoutRequest = CreatePaymentBody;

type CheckoutSheetProps = {
  request: CheckoutRequest | null;
  /** Resume an existing pending payment instead of creating a new one. */
  existingPayment?: PaymentDto | null;
  onClose: () => void;
  onPaid?: (payment: PaymentDto) => void;
  /** Fires once when an early-access request (no transfer) has been recorded. */
  onRequested?: (payment: PaymentDto) => void;
};

const titleFor = (request: CheckoutRequest | null, payment: PaymentDto | null): string => {
  if (payment?.isRequest) return payment.purpose === 'topup' ? 'Request a top-up' : `Request ${payment.itemLabel}`;
  if (payment) return payment.purpose === 'topup' ? 'Top up photos' : `Pay for ${payment.itemLabel}`;
  if (request?.purpose === 'topup' && isTopupId(request.topupId)) return `Top up ${TOPUPS[request.topupId].credits} photos`;
  return 'Checkout';
};

const savingsFor = (request: CheckoutRequest | null): number =>
  request?.purpose === 'subscription' && isPlanId(request.planId) && isTermMonths(request.termMonths)
    ? getTermSavingsUsdCents(request.planId, request.termMonths)
    : 0;

type CreateResult = { key: string; payment: PaymentDto | null; error: string | null };

/** Creates the payment for `request` once per request/attempt. State is keyed so stale results are ignored. */
const useCreatedPayment = (request: CheckoutRequest | null, existing: PaymentDto | null) => {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<CreateResult | null>(null);
  const key = request ? `${JSON.stringify(request)}#${attempt}` : '';

  useEffect(() => {
    if (existing || !request) return;
    let cancelled = false;
    apiFetch<{ payment: PaymentDto }>('/api/app/payments', { method: 'POST', json: request })
      .then((data) => {
        if (!cancelled) setResult({ key, payment: data.payment, error: null });
        track(data.payment.isRequest ? 'plan_requested' : 'checkout_opened', { purpose: data.payment.purpose, item: data.payment.itemLabel });
      })
      .catch((err: unknown) => {
        const message = err instanceof ApiError ? err.message : "We couldn't open the payment.";
        if (!cancelled) setResult({ key, payment: null, error: message });
      });
    return () => {
      cancelled = true;
    };
  }, [request, existing, key]);

  const current = result?.key === key ? result : null;
  return {
    created: existing ?? current?.payment ?? null,
    error: existing ? null : current?.error ?? null,
    retry: () => setAttempt((n) => n + 1),
  };
};

export const CheckoutSheet = ({ request, existingPayment = null, onClose, onPaid, onRequested }: CheckoutSheetProps) => {
  const open = request !== null || existingPayment !== null;
  const { created, error: createError, retry } = useCreatedPayment(request, existingPayment);
  const { payment, error: statusError, simulate, simulating } = usePaymentStatus(created);
  const notifiedFor = useRef<string | null>(null);

  useEffect(() => {
    if (payment?.state === 'paid' && notifiedFor.current !== payment.id) {
      notifiedFor.current = payment.id;
      track('payment_paid', { purpose: payment.purpose, item: payment.itemLabel });
      onPaid?.(payment);
    }
    if (payment?.isRequest && payment.state === 'pending' && notifiedFor.current !== payment.id) {
      notifiedFor.current = payment.id;
      onRequested?.(payment);
    }
  }, [payment, onPaid, onRequested]);

  const handleClose = useCallback(() => onClose(), [onClose]);

  return (
    <Sheet open={open} onClose={handleClose} title={titleFor(request, payment)} side="bottom" className="sm:left-1/2 sm:right-auto sm:w-full sm:max-w-xl sm:-translate-x-1/2">
      <div className="flex flex-col gap-4 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
        <CheckoutBody
          payment={payment}
          createError={createError}
          statusError={statusError}
          savingsCents={savingsFor(request)}
          onRetry={retry}
          onSimulate={simulate}
          simulating={simulating}
          onDone={handleClose}
        />
      </div>
    </Sheet>
  );
};

type BodyProps = {
  payment: PaymentDto | null;
  createError: string | null;
  statusError: string | null;
  savingsCents: number;
  simulating: boolean;
  onRetry: () => void;
  onSimulate: () => void;
  onDone: () => void;
};

const CheckoutBody = ({ payment, createError, statusError, savingsCents, simulating, onRetry, onSimulate, onDone }: BodyProps) => {
  if (createError) return <ErrorState message={createError} onRetry={onRetry} />;
  if (!payment) return <SkeletonText lines={6} />;

  if (payment.state === 'paid') {
    return (
      <>
        <PaidStatus title={payment.isRequest ? 'Plan activated' : 'Payment received'} body="Your photos are ready to use. Thanks for choosing Next5." />
        <AppButton fullWidth size="lg" onClick={onDone}>Continue</AppButton>
      </>
    );
  }
  if (payment.state === 'underpaid') {
    const missing = payment.amountVnd - (payment.paidVnd ?? 0);
    return <ErrorState message={`We received ${formatVnd(payment.paidVnd ?? 0)} — ${formatVnd(missing)} is missing. Contact us and we'll sort it out.`} supportHref="mailto:hello@next5.studio" />;
  }
  if (payment.isRequest && payment.state === 'pending') {
    return (
      <>
        <CheckoutSummary payment={payment} savingsCents={savingsCents} />
        <RequestReceived payment={payment} />
        <AppButton fullWidth size="lg" onClick={onDone}>Continue</AppButton>
      </>
    );
  }
  if (payment.state === 'expired' && payment.isRequest) {
    return <ErrorState message="This request has expired. Send a new one and we'll get back to you within 24 hours." onRetry={onRetry} />;
  }
  if (payment.state === 'expired') {
    return <ErrorState message="This QR code has expired. Already transferred? It will still be matched automatically within 72 hours." onRetry={onRetry} />;
  }

  return (
    <>
      <CheckoutSummary payment={payment} savingsCents={savingsCents} />
      <QrAndBank payment={payment} />
      <WaitingStatus payment={payment} />
      {statusError && <p className="text-[13px] text-app-danger">{statusError}</p>}
      {payment.canSimulate && (
        <AppButton variant="secondary" fullWidth loading={simulating} onClick={onSimulate}>
          Simulate transfer (test mode)
        </AppButton>
      )}
    </>
  );
};
