'use client';

import { useEffect } from 'react';
import type { PhotoRoute } from '../../../data/routes';
import { usePayment } from '../../../hooks/usePayment';
import { applyDiscount, formatVnd } from '../../../lib/format';
import type { PaymentIntent } from '../../../services/payment';
import type { PaymentStatus } from '../../../types/booking';
import { Button } from '../../ui/Button';
import { CopyField } from '../payment/CopyField';
import { QrPlaceholder } from '../ui/QrPlaceholder';
import { StepLayout } from '../ui/StepLayout';
import { StepHeading } from '../ui/StepHeading';

type PaymentStepProps = {
  route: PhotoRoute;
  bookingId: string;
  status: PaymentStatus;
  onStatusChange: (status: PaymentStatus) => void;
  onConfirmed: () => void;
  onCancel: () => void;
  /** From a claimed upsell offer — 0 when this route isn't discounted. */
  discountPercent?: number;
};

export const PaymentStep = ({
  route,
  bookingId,
  status,
  onStatusChange,
  onConfirmed,
  onCancel,
  discountPercent = 0,
}: PaymentStepProps) => {
  const finalPriceVnd =
    discountPercent > 0 ? applyDiscount(route.priceVnd, discountPercent) : route.priceVnd;

  const { intent, isCreating, error, retry, simulateTransfer } = usePayment(
    { bookingId, amountVnd: finalPriceVnd, routeTitle: route.title },
    onStatusChange,
  );

  useEffect(() => {
    if (status === 'confirmed') onConfirmed();
  }, [status, onConfirmed]);

  if (status !== 'pending') {
    return (
      <StepLayout centered>
        <PaymentReceived />
      </StepLayout>
    );
  }

  return (
    <StepLayout
      footer={
        <div className="flex items-center justify-between gap-4">
          <p className="text-[11.5px] text-muted">
            Keep this window open until we detect your transfer.
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 text-[11.5px] text-muted underline underline-offset-4 transition-colors duration-200 hover:text-ink"
          >
            Cancel
          </button>
        </div>
      }
    >
      <StepHeading
        eyebrow={`${route.title} · 5 photos`}
        title="Complete your shoot"
        subtitle="Scan with your banking app. We detect the transfer automatically — no proof of payment needed."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-start lg:gap-10">
        <div className="mx-auto w-full max-w-[320px] lg:mx-0">
          {isCreating && <QrSkeleton />}
          {error && <PaymentError message={error} onRetry={retry} />}
          {intent && !error && <QrCard intent={intent} />}
        </div>

        {intent && !error && (
          <PaymentDetails
            intent={intent}
            onSimulate={simulateTransfer}
            originalAmountVnd={discountPercent > 0 ? route.priceVnd : undefined}
            discountPercent={discountPercent}
          />
        )}
      </div>
    </StepLayout>
  );
};

const QrCard = ({ intent }: { intent: PaymentIntent }) => (
  <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
    {intent.qrImageUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={intent.qrImageUrl}
        alt={`Payment QR code for ${formatVnd(intent.amountVnd)} VND`}
        className="mx-auto aspect-square w-full"
      />
    ) : (
      <QrPlaceholder value={intent.reference} className="mx-auto aspect-square w-full" />
    )}
  </div>
);

type PaymentDetailsProps = {
  intent: PaymentIntent;
  onSimulate: (() => void) | undefined;
  originalAmountVnd?: number;
  discountPercent?: number;
};

const PaymentDetails = ({ intent, onSimulate, originalAmountVnd, discountPercent }: PaymentDetailsProps) => (
  <div className="mt-2 lg:mt-0">
    {originalAmountVnd && discountPercent ? (
      <div className="flex items-center gap-2.5">
        <p className="font-serif text-[30px] leading-none">
          <span className="text-muted text-[16px] line-through">{formatVnd(originalAmountVnd)}</span>{' '}
          <span className="text-gold">{formatVnd(intent.amountVnd)}</span>{' '}
          <span className="text-[16px] text-ink">VND</span>
        </p>
        <span className="label-caps rounded-full bg-accent px-2.5 py-1 text-[9.5px] font-medium text-white">
          -{discountPercent}%
        </span>
      </div>
    ) : (
      <p className="font-serif text-[30px] leading-none">
        <span className="text-gold">{formatVnd(intent.amountVnd)}</span>{' '}
        <span className="text-[16px] text-ink">VND</span>
      </p>
    )}

    <div className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface px-4">
      <CopyField label="Transfer note" value={intent.reference} />
      {intent.bankAccount && (
        <>
          <CopyField label="Account number" value={intent.bankAccount.accountNumber} />
          <CopyField label="Account holder" value={intent.bankAccount.accountHolder} />
          <CopyField label="Bank" value={intent.bankAccount.bank} />
        </>
      )}
      <CopyField label="Amount" value={String(intent.amountVnd)} />
    </div>

    <p className="mt-3 text-[11.5px] text-muted">
      The transfer note is how we match your payment — please keep it exactly as shown.
    </p>

    <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-surface-alt px-4 py-3 text-[13px] text-ink">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
      </span>
      Waiting for your payment…
    </div>

    {intent.isMock && onSimulate && (
      <div className="mt-5 rounded-xl border border-dashed border-line px-4 py-3">
        <p className="text-[11px] text-muted">
          Demo QR — SEPAY is not connected yet, so nothing is charged.
        </p>
        <button
          type="button"
          onClick={onSimulate}
          className="mt-1.5 text-[11.5px] font-medium text-accent-strong underline underline-offset-4"
        >
          Simulate the transfer
        </button>
      </div>
    )}
  </div>
);

const PaymentError = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="rounded-2xl border border-line bg-surface p-6 text-center">
    <p className="text-[13px] text-ink">{message}</p>
    <Button onClick={onRetry} size="sm" className="mt-4">
      Try again
    </Button>
  </div>
);

const QrSkeleton = () => (
  <div aria-live="polite">
    <div className="aspect-square w-full animate-pulse rounded-2xl bg-surface-alt" />
    <p className="mt-4 text-center text-[12.5px] text-muted">Preparing your payment…</p>
  </div>
);

const PaymentReceived = () => (
  <div className="animate-fade-in flex flex-col items-center py-10 text-center">
    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/12 text-accent-strong">
      <svg
        viewBox="0 0 24 24"
        className="h-8 w-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m4.5 12.5 5 5 10-11" />
      </svg>
    </span>
    <p className="mt-5 font-serif text-[24px] tracking-[0.05em] text-ink uppercase">
      Payment confirmed
    </p>
    <p className="mt-2 text-[13px] text-muted">Your shoot has started…</p>
  </div>
);
