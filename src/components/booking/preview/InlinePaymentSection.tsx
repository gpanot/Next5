'use client';

import type { PaymentIntent } from '../../../services/payment';
import { discountBadgeLabel, formatVnd } from '../../../lib/format';
import type { PhotoRoute } from '../../../data/routes';
import { Button } from '../../ui/Button';
import { CopyField } from '../payment/CopyField';
import { QrPlaceholder } from '../ui/QrPlaceholder';

// ── Skeleton / error / success states ────────────────────────────────────────

export const QrSkeleton = () => (
  <div aria-live="polite">
    <div className="aspect-square w-full animate-pulse rounded-2xl bg-surface-alt" />
    <p className="mt-4 text-center text-[12.5px] text-muted">Preparing your payment…</p>
  </div>
);

export const QrError = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="rounded-2xl border border-line bg-surface p-6 text-center">
    <p className="text-[13px] text-ink">{message}</p>
    <Button onClick={onRetry} size="sm" className="mt-4">Try again</Button>
  </div>
);

export const PaymentReceived = () => (
  <div className="animate-fade-in flex flex-col items-center py-10 text-center">
    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/12 text-accent-strong">
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m4.5 12.5 5 5 10-11" />
      </svg>
    </span>
    <p className="mt-5 font-serif text-[24px] tracking-[0.05em] text-ink uppercase">Payment confirmed</p>
    <p className="mt-2 text-[13px] text-muted">Your shoot has started…</p>
  </div>
);

// ── Main inline payment section ───────────────────────────────────────────────

type Props = {
  route: PhotoRoute;
  discountPercent: number;
  isCreating: boolean;
  paymentError: string | null;
  intent: PaymentIntent | null;
  retry: () => void;
  simulateTransfer?: (() => void) | null;
};

export const InlinePaymentSection = ({
  route,
  discountPercent,
  isCreating,
  paymentError,
  intent,
  retry,
  simulateTransfer,
}: Props) => {
  return (
    <div>
      <div className="mb-6">
        <p className="label-caps text-[9px] font-medium text-muted">Step 2 of 2</p>
        <h3 className="mt-1 font-serif text-[24px] leading-tight text-ink">
          Complete payment to go to your studio.
        </h3>
        <p className="mt-1.5 text-[13px] text-muted">
          Scan with your banking app — we detect the transfer automatically, no proof needed.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-start lg:gap-10">
        <div className="mx-auto w-full max-w-[320px] lg:mx-0">
          {isCreating && <QrSkeleton />}
          {paymentError && <QrError message={paymentError} onRetry={retry} />}
          {intent && !paymentError && (
            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              {intent.qrImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={intent.qrImageUrl}
                  alt={`Payment QR — ${formatVnd(intent.amountVnd)} VND`}
                  className="mx-auto aspect-square w-full"
                />
              ) : (
                <QrPlaceholder value={intent.reference} className="mx-auto aspect-square w-full" />
              )}
            </div>
          )}
        </div>

        {intent && !paymentError && (
          <div className="mt-2 lg:mt-0">
            {discountPercent > 0 ? (
              <div className="flex items-center gap-2.5">
                <p className="font-serif text-[30px] leading-none">
                  <span className="text-[16px] text-muted line-through">{formatVnd(route.priceVnd)}</span>{' '}
                  <span className="text-gold">{formatVnd(intent.amountVnd)}</span>{' '}
                  <span className="text-[16px] text-ink">VND</span>
                </p>
                <span className="label-caps rounded-full bg-accent px-2.5 py-1 text-[9.5px] font-medium text-white">
                  {discountBadgeLabel(discountPercent)}
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
              The transfer note is how we match your payment — keep it exactly as shown.
            </p>

            <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-surface-alt px-4 py-3 text-[13px] text-ink">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
              </span>
              Waiting for your payment…
            </div>

            {intent.isMock && simulateTransfer && (
              <div className="mt-4 rounded-xl border border-dashed border-line px-4 py-3">
                <p className="text-[11px] text-muted">Demo QR — nothing is charged.</p>
                <button
                  type="button"
                  onClick={simulateTransfer}
                  className="mt-1.5 text-[11.5px] font-medium text-accent-strong underline underline-offset-4"
                >
                  Simulate the transfer
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
