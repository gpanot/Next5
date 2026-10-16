'use client';

import { useState } from 'react';
import { MAX_TOPUP_CENTS, MIN_TOPUP_CENTS, START_DAYS, START_PER_DAY, dollarsToCents, planCents, usd } from '../../../../../types/admin/slideshowCredits';
import { adminFetch } from '../../../business/useAdminApi';
import { PlanPicker } from '../../pricing/PlanPicker';
import { here } from './useCheckoutReturn';
import { postsLabel } from './BalanceCard';
import { cardClass, MoneyInput, primaryButton, SectionTitle } from './fields';

type Props = { token: string; workspaceId: string; priceCents: number; disabled: boolean };

/** The amount in cents when it can be paid, else null. */
const payable = (cents: number | null): number | null => (cents !== null && cents >= MIN_TOPUP_CENTS && cents <= MAX_TOPUP_CENTS ? cents : null);

function useCheckout(token: string, workspaceId: string) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pay = async (amountCents: number) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { url } = await adminFetch<{ url: string }>(token, '/api/slideshow/credits/checkout', { method: 'POST', body: JSON.stringify({ amountCents, workspaceId, returnPath: here() }) });
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open checkout');
      setBusy(false);
    }
  };
  return { busy, error, pay };
}

/** Buy by content: days × posts a day (starts on 7 × 1; 60 × 4 is tagged "Best"). "Other amount" keeps a typed dollar top up. Pay by card on Stripe's page. */
export function TopUpCard({ token, workspaceId, priceCents, disabled }: Props) {
  const [days, setDays] = useState<number>(START_DAYS);
  const [perDay, setPerDay] = useState<number>(START_PER_DAY);
  const [custom, setCustom] = useState<string | null>(null);
  const { busy, error, pay } = useCheckout(token, workspaceId);
  const cents = payable(custom === null ? planCents(days, perDay, priceCents) : dollarsToCents(custom));
  const posts = cents !== null ? Math.floor(cents / priceCents) : 0;

  return (
    <section className={cardClass}>
      <SectionTitle title="Buy posts" hint="Pick how many days and how many posts a day. Pay once. No subscription." />
      {custom === null ? (
        <>
          <PlanPicker days={days} perDay={perDay} onDays={setDays} onPerDay={setPerDay} />
          <p className="mt-4 text-sm text-muted dark:text-zinc-400">
            {days} days × {perDay} a day = <span className="font-semibold text-ink dark:text-zinc-100">{postsLabel(days * perDay)}</span>
          </p>
        </>
      ) : (
        <MoneyInput
          id="topup-amount"
          label="Amount"
          value={custom}
          onChange={setCustom}
          hint={cents !== null ? `You get ${postsLabel(posts)}.` : `Whole dollars, ${usd(MIN_TOPUP_CENTS)} to ${usd(MAX_TOPUP_CENTS)}.`}
        />
      )}
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      <button type="button" onClick={() => cents !== null && void pay(cents)} disabled={cents === null || busy || disabled} className={`${primaryButton} mt-3 w-full`}>
        {busy ? 'Opening checkout…' : cents !== null ? `Pay ${usd(cents)} for ${postsLabel(posts)}` : 'Pay by card'}
      </button>
      <div className="mt-2 flex flex-col items-center gap-1">
        <button type="button" onClick={() => setCustom(custom === null ? String(MIN_TOPUP_CENTS / 100) : null)} className="min-h-9 text-xs font-medium text-blue-600 transition hover:underline dark:text-blue-400">
          {custom === null ? 'Or type an amount' : 'Back to days and posts'}
        </button>
        <p className="text-center text-xs text-muted dark:text-zinc-400">Secure payment by Stripe. Your card is saved for auto top up.</p>
      </div>
    </section>
  );
}
