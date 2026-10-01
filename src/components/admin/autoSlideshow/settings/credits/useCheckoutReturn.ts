'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '../../../business/useAdminApi';

export type CheckoutReturn = { tone: 'ok' | 'info'; text: string } | null;

/** URL that Stripe Checkout sends the browser back to: `?credits=paid|card|cancel&session_id=cs_…`. */
export const CREDITS_PARAM = 'credits';

/** True when the page was opened by a Stripe return, so the Settings → Credits tab should open. */
export const isCheckoutReturn = (): boolean => typeof window !== 'undefined' && new URL(window.location.href).searchParams.has(CREDITS_PARAM);

type Pending = { state: string; sessionId: string | null } | null;

const readReturn = (): Pending => {
  if (typeof window === 'undefined') return null;
  const params = new URL(window.location.href).searchParams;
  const state = params.get(CREDITS_PARAM);
  return state ? { state, sessionId: params.get('session_id') } : null;
};

const messageFor = (state: string): CheckoutReturn =>
  state === 'cancel' ? { tone: 'info', text: 'Checkout closed. Nothing was charged.' } : { tone: 'ok', text: state === 'card' ? 'Card saved.' : 'Payment received. Your credits are added.' };

/**
 * Reads the Stripe return once: confirms the session (credits land even if the webhook is late), clears the URL, then
 * refreshes the balance. Returns the message to show once confirmed.
 */
export const useCheckoutReturn = (token: string, onDone: () => void): CheckoutReturn => {
  const [pending] = useState(readReturn);
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    if (!pending) return;
    const url = new URL(window.location.href);
    url.searchParams.delete(CREDITS_PARAM);
    url.searchParams.delete('session_id');
    window.history.replaceState(null, '', url.toString());
    const confirm = pending.sessionId ? adminFetch(token, '/api/slideshow/credits/confirm', { method: 'POST', body: JSON.stringify({ sessionId: pending.sessionId }) }) : Promise.resolve();
    void confirm.catch(() => undefined).then(() => {
      setConfirmed(true);
      onDone();
    });
    // Runs once per page load: the URL is cleared above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return pending && confirmed ? messageFor(pending.state) : null;
};
