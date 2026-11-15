'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/apiClient';
import type { PaymentDto } from '../types/business/payments';

/**
 * Back from Stripe Checkout (`?payment=…&checkout=paid&session_id=…` or `checkout=cancel`): loads that payment
 * (the session id confirms it server side in case the webhook is late) so the page can reopen the checkout sheet.
 * Cleans the query string once read.
 */
export const useCheckoutReturn = () => {
  const [returned, setReturned] = useState<PaymentDto | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const paymentId = url.searchParams.get('payment');
    const state = url.searchParams.get('checkout');
    if (!paymentId || (state !== 'paid' && state !== 'cancel')) return;
    const sessionId = url.searchParams.get('session_id');
    ['payment', 'checkout', 'session_id'].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState(window.history.state, '', url.toString());
    const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
    apiFetch<{ payment: PaymentDto }>(`/api/app/payments/${encodeURIComponent(paymentId)}${query}`)
      .then((data) => setReturned(data.payment))
      .catch(() => setReturned(null));
  }, []);

  return { returned, clearReturned: () => setReturned(null) };
};
