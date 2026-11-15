'use client';

import { CreditCard, Loader2, Lock } from 'lucide-react';
import { useState } from 'react';
import { ApiError, apiFetch } from '../../lib/apiClient';
import type { PaymentDto } from '../../types/business/payments';
import { AppButton } from '../ui/AppButton';

/** Pending card payment: a fresh Stripe Checkout page on tap. Polling (usePaymentStatus) flips it to paid when the webhook lands. */
export const CardCheckout = ({ payment }: { payment: PaymentDto }) => {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    setOpening(true);
    setError(null);
    try {
      const { url } = await apiFetch<{ url: string }>(`/api/app/payments/${payment.id}/checkout`, { method: 'POST', json: { returnPath: window.location.pathname } });
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not open checkout. Try again in a minute.');
      setOpening(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-xl border border-app-line p-3" role="status" aria-live="polite">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-app-accent" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-app-ink">Waiting for your card payment</p>
          <p className="text-[12px] text-app-muted">Paid already? This updates on its own in a few seconds.</p>
        </div>
      </div>
      <AppButton fullWidth size="lg" loading={opening} onClick={pay} iconLeft={<CreditCard className="h-4 w-4" />}>
        Pay by card
      </AppButton>
      {error && <p className="text-[13px] text-app-danger">{error}</p>}
      <p className="flex items-center justify-center gap-1.5 text-[12px] text-app-muted">
        <Lock className="h-3 w-3" aria-hidden />
        Secure checkout by Stripe. We never see your card number.
      </p>
    </div>
  );
};
