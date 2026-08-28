'use client';

import { useEffect } from 'react';
import type { PhotoRoute } from '../../../data/routes';
import { usePayment } from '../../../hooks/usePayment';
import { formatVnd } from '../../../lib/format';
import type { PaymentStatus } from '../../../types/booking';
import { Button } from '../../ui/Button';
import { QrPlaceholder } from '../ui/QrPlaceholder';
import { StepHeading } from '../ui/StepHeading';

type PaymentStepProps = {
  route: PhotoRoute;
  bookingId: string;
  status: PaymentStatus;
  onStatusChange: (status: PaymentStatus) => void;
  onConfirmed: () => void;
};

export const PaymentStep = ({
  route,
  bookingId,
  status,
  onStatusChange,
  onConfirmed,
}: PaymentStepProps) => {
  const { intent, isCreating, error, retry, simulateTransfer } = usePayment(
    { bookingId, amountVnd: route.priceVnd, routeTitle: route.title },
    onStatusChange,
  );

  useEffect(() => {
    if (status === 'confirmed') onConfirmed();
  }, [status, onConfirmed]);

  return (
    <section className="pb-8">
      {status === 'pending' && (
        <StepHeading
          eyebrow={`${route.title} · 5 photos`}
          title="Complete your shoot"
          subtitle="Scan to pay. We detect it automatically — no proof of payment needed."
        />
      )}

      <div className="mt-7 flex flex-col items-center">
        {isCreating && <QrSkeleton />}

        {error && (
          <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 text-center">
            <p className="text-[13px] text-ink">{error}</p>
            <Button onClick={retry} size="sm" className="mt-4">
              Try again
            </Button>
          </div>
        )}

        {intent && !error && status === 'pending' && (
          <>
            <div className="rounded-2xl border border-line bg-white p-4 shadow-card sm:p-5">
              {intent.qrImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={intent.qrImageUrl}
                  alt={`SEPAY QR code for ${formatVnd(intent.amountVnd)} VND`}
                  className="h-56 w-56 sm:h-64 sm:w-64"
                />
              ) : (
                <QrPlaceholder value={intent.reference} className="h-56 w-56 sm:h-64 sm:w-64" />
              )}
            </div>

            <p className="mt-5 font-serif text-[26px]">
              <span className="text-gold">{formatVnd(intent.amountVnd)}</span>{' '}
              <span className="text-ink">VND</span>
            </p>

            <p className="mt-1.5 text-[11.5px] text-muted">
              Transfer note <span className="font-medium text-ink">{intent.reference}</span>
            </p>

            <div className="mt-6 flex items-center gap-2.5 text-[13px] text-muted">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
              </span>
              Waiting for payment…
            </div>

            {intent.isMock && simulateTransfer && (
              <div className="mt-6 rounded-xl border border-dashed border-line px-4 py-3 text-center">
                <p className="text-[11px] text-muted">
                  Demo QR — SEPAY is not connected yet, so nothing is charged.
                </p>
                <button
                  type="button"
                  onClick={simulateTransfer}
                  className="mt-1.5 text-[11.5px] font-medium text-accent-strong underline underline-offset-4"
                >
                  Simulate the transfer
                </button>
              </div>
            )}
          </>
        )}

        {status !== 'pending' && <PaymentReceived />}
      </div>
    </section>
  );
};

const QrSkeleton = () => (
  <div className="flex flex-col items-center" aria-live="polite">
    <div className="h-64 w-64 animate-pulse rounded-2xl bg-surface-alt" />
    <div className="mt-5 h-6 w-40 animate-pulse rounded-full bg-surface-alt" />
    <p className="mt-4 text-[12.5px] text-muted">Preparing your payment…</p>
  </div>
);

const PaymentReceived = () => (
  <div className="animate-fade-in flex flex-col items-center py-10 text-center">
    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/12 text-accent-strong">
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m4.5 12.5 5 5 10-11" />
      </svg>
    </span>
    <p className="mt-5 font-serif text-[24px] tracking-[0.05em] text-ink uppercase">
      Payment confirmed
    </p>
    <p className="mt-2 text-[13px] text-muted">Your shoot has started…</p>
  </div>
);
