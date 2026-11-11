'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  paymentService,
  type PaymentIntent,
  type PaymentIntentInput,
} from '../services/payment';
import type { PaymentStatus } from '../types/booking';

type UsePaymentResult = {
  intent: PaymentIntent | null;
  isCreating: boolean;
  error: string | null;
  retry: () => void;
  simulateTransfer: (() => void) | undefined;
};

export const usePayment = (
  input: PaymentIntentInput | null,
  onStatusChange: (status: PaymentStatus) => void,
): UsePaymentResult => {
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [attempt, setAttempt] = useState(0);
  /** The request that last finished (its key) and its error; the current one is creating until its key lands here. */
  const [settled, setSettled] = useState<{ key: string; error: string | null } | null>(null);

  const bookingId = input?.bookingId ?? null;
  const amountVnd = input?.amountVnd ?? 0;
  const routeTitle = input?.routeTitle ?? '';
  const key = bookingId ? `${bookingId}|${amountVnd}|${routeTitle}|${attempt}` : null;
  const isCreating = key !== null && settled?.key !== key;
  const error = key !== null && settled?.key === key ? settled.error : null;

  useEffect(() => {
    if (!bookingId || !key) return;

    let cancelled = false;
    let unwatch: (() => void) | undefined;

    paymentService
      .createIntent({ bookingId, amountVnd, routeTitle })
      .then((created) => {
        if (cancelled) return;
        setIntent(created);
        setSettled({ key, error: null });
        unwatch = paymentService.watch(created.reference, ({ status }) => {
          onStatusChange(status);
        });
      })
      .catch(() => {
        if (cancelled) return;
        setSettled({ key, error: "We couldn't open the payment. Please try again." });
      });

    return () => {
      cancelled = true;
      unwatch?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, amountVnd, routeTitle, attempt, key]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  const simulateTransfer =
    intent && paymentService.simulateTransfer
      ? () => paymentService.simulateTransfer?.(intent.reference)
      : undefined;

  return { intent, isCreating, error, retry, simulateTransfer };
};
