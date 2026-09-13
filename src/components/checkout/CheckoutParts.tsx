'use client';

import { CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { formatUsd, formatVnd } from '../../lib/money';
import { formatCountdown, useCountdown } from '../../hooks/useCountdown';
import type { PaymentDto } from '../../types/business/payments';
import { QrPlaceholder } from '../booking/ui/QrPlaceholder';
import { CopyRow } from './CopyRow';

export const CheckoutSummary = ({ payment, savingsCents }: { payment: PaymentDto; savingsCents: number }) => (
  <div className="rounded-xl bg-app-sunken p-4">
    <p className="text-[13px] text-app-muted">{payment.itemLabel}</p>
    <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
      {payment.amountUsdCents !== null && (
        <span className="text-[26px] font-semibold tabular-nums text-app-ink">
          {formatUsd(payment.amountUsdCents, { showCents: true })}
        </span>
      )}
      {savingsCents > 0 && <span className="text-[13px] font-medium text-app-success">You save {formatUsd(savingsCents)}</span>}
    </div>
    <p className="mt-1 text-[13px] text-app-muted">
      You&apos;ll transfer <span className="font-semibold tabular-nums text-app-ink">{formatVnd(payment.amountVnd)}</span>
      {payment.fxVndPerUsd ? ` at ${formatVnd(payment.fxVndPerUsd)}/$` : ''}
    </p>
  </div>
);

export const QrAndBank = ({ payment }: { payment: PaymentDto }) => (
  <div className="grid gap-4 sm:grid-cols-[168px_1fr] sm:items-start">
    <div className="mx-auto w-40 rounded-xl bg-white p-2 shadow-sm ring-1 ring-black/5 sm:mx-0 dark:ring-white/10">
      {payment.qrImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- external VietQR image from the payment provider
        <img src={payment.qrImageUrl} alt={`Payment QR code for ${payment.reference}`} className="h-auto w-full" />
      ) : (
        <QrPlaceholder value={payment.reference} className="h-auto w-full text-[#1a1714]" />
      )}
    </div>
    <div className="divide-y divide-app-line">
      <CopyRow label="Bank" value={payment.bank.bank} />
      <CopyRow label="Account number" value={payment.bank.accountNumber} />
      <CopyRow label="Account name" value={payment.bank.accountName} />
      <CopyRow label="Amount" value={formatVnd(payment.amountVnd)} />
      <CopyRow label="Transfer memo — must include" value={payment.reference} emphasis />
    </div>
  </div>
);

export const WaitingStatus = ({ payment }: { payment: PaymentDto }) => {
  const seconds = useCountdown(payment.expiresAt);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-app-line p-3" role="status" aria-live="polite">
      <Loader2 className="h-5 w-5 shrink-0 animate-spin text-app-accent" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-app-ink">Waiting for your transfer</p>
        <p className="text-[12px] text-app-muted">Scan with your banking app and keep the memo exactly as shown.</p>
      </div>
      <span className="flex items-center gap-1 text-[13px] tabular-nums text-app-muted">
        <Clock className="h-3.5 w-3.5" aria-hidden />
        {formatCountdown(seconds)}
      </span>
    </div>
  );
};

export const PaidStatus = ({ title, body }: { title: string; body: string }) => (
  <div className="flex flex-col items-center gap-3 py-6 text-center" role="status" aria-live="polite">
    <CheckCircle2 className="h-12 w-12 text-app-success" aria-hidden />
    <p className="text-[18px] font-semibold text-app-ink">{title}</p>
    <p className="max-w-sm text-[14px] text-app-muted">{body}</p>
  </div>
);
