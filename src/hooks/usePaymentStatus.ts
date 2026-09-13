'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiFetch } from '../lib/apiClient';
import type { PaymentDto } from '../types/business/payments';

const POLL_MS = 3_000;

type PaymentResponse = { payment: PaymentDto };

/** Polls a payment every 3 s while it is pending; pauses when the tab is hidden. */
export const usePaymentStatus = (initial: PaymentDto | null) => {
  // Latest server copy; only trusted while it belongs to the payment we were given.
  const [fetched, setPayment] = useState<PaymentDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const payment = fetched && initial && fetched.id === initial.id ? fetched : initial;
  const paymentId = payment?.id ?? null;
  const isPending = payment?.state === 'pending';
  const timer = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!paymentId) return;
    try {
      const data = await apiFetch<PaymentResponse>(`/api/app/payments/${paymentId}`);
      setPayment(data.payment);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not check the payment status.');
    }
  }, [paymentId]);

  useEffect(() => {
    if (!paymentId || !isPending) return;
    const tick = () => {
      if (!document.hidden) void refresh();
      timer.current = window.setTimeout(tick, POLL_MS);
    };
    timer.current = window.setTimeout(tick, POLL_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [paymentId, isPending, refresh]);

  const simulate = useCallback(async () => {
    if (!paymentId) return;
    setSimulating(true);
    try {
      const data = await apiFetch<PaymentResponse>(`/api/app/payments/${paymentId}/simulate`, { method: 'POST' });
      setPayment(data.payment);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not simulate the transfer.');
    } finally {
      setSimulating(false);
    }
  }, [paymentId]);

  return { payment, error, refresh, simulate, simulating };
};
