'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '../../../business/useAdminApi';
import { BRAND_CAST_PARAM } from '../../campaigns/brandCastResume';

export type CheckoutReturn = { tone: 'ok' | 'info'; text: string } | null;

/** URL that Stripe Checkout sends the browser back to: `?credits=paid|card|cancel&session_id=cs_…`. */
export const CREDITS_PARAM = 'credits';

/** The page Stripe Checkout should send the browser back to: this one. */
export const here = (): string => window.location.pathname + window.location.search;

/**
 * True when the page was opened by a Stripe return, so the Settings → Credits tab should open. Not with a campaign
 * open (`?campaign=`) or the Brand Cast step (`?brandCast=`): checkout started there, which confirms the payment itself.
 */
export const isCheckoutReturn = (): boolean => {
  if (typeof window === 'undefined') return false;
  const params = new URL(window.location.href).searchParams;
  return params.has(CREDITS_PARAM) && !params.has('campaign') && !params.has(BRAND_CAST_PARAM);
};

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
