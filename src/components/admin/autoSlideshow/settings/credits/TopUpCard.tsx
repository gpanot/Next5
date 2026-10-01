'use client';

import { useState } from 'react';
import { MAX_TOPUP_CENTS, MIN_TOPUP_CENTS, TOPUP_PRESETS_CENTS, dollarsToCents, usd } from '../../../../../types/admin/slideshowCredits';
import { adminFetch } from '../../../business/useAdminApi';
import { postsLabel } from './BalanceCard';
import { cardClass, MoneyInput, primaryButton, SectionTitle } from './fields';

type Props = { token: string; workspaceId: string; priceCents: number; disabled: boolean };

/** Pick or type an amount ($10 minimum), then pay by card on Stripe's page. */
export function TopUpCard({ token, workspaceId, priceCents, disabled }: Props) {
  const [amount, setAmount] = useState(String(TOPUP_PRESETS_CENTS[1] / 100));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cents = dollarsToCents(amount);
  /** The amount in cents when it can be paid, else null. */
  const valid = cents !== null && cents >= MIN_TOPUP_CENTS && cents <= MAX_TOPUP_CENTS ? cents : null;

  const pay = async () => {
    if (valid === null || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { url } = await adminFetch<{ url: string }>(token, '/api/slideshow/credits/checkout', { method: 'POST', body: JSON.stringify({ amountCents: valid, workspaceId }) });
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open checkout');
      setBusy(false);
    }
  };

  return (
    <section className={cardClass}>
      <SectionTitle title="Top up credits" hint={`${usd(MIN_TOPUP_CENTS)} minimum. Pay once by card. No subscription.`} />
      <div className="grid grid-cols-4 gap-2">
        {TOPUP_PRESETS_CENTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setAmount(String(p / 100))}
            aria-pressed={cents === p}
            className="group flex min-h-14 flex-col items-center justify-center rounded-xl border border-line text-ink transition active:scale-95 aria-pressed:border-blue-600 aria-pressed:bg-blue-50 aria-pressed:text-blue-700 dark:border-zinc-700 dark:text-zinc-100 dark:aria-pressed:bg-blue-950 dark:aria-pressed:text-blue-300"
          >
            <span className="text-sm font-semibold">{usd(p).replace('.00', '')}</span>
            <span className="text-[11px] text-muted group-aria-pressed:text-blue-600 dark:text-zinc-400 dark:group-aria-pressed:text-blue-300">{postsLabel(Math.floor(p / priceCents))}</span>
          </button>
        ))}
      </div>
      <div className="mt-3">
        <MoneyInput
          id="topup-amount"
          label="Amount"
          value={amount}
          onChange={setAmount}
          hint={valid !== null ? `You get ${postsLabel(Math.floor(valid / priceCents))}.` : `Whole dollars, ${usd(MIN_TOPUP_CENTS)} to ${usd(MAX_TOPUP_CENTS)}.`}
        />
      </div>
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      <button type="button" onClick={() => void pay()} disabled={valid === null || busy || disabled} className={`${primaryButton} mt-3 w-full`}>
        {busy ? 'Opening checkout…' : valid !== null ? `Pay ${usd(valid)} for ${postsLabel(Math.floor(valid / priceCents))}` : 'Pay by card'}
      </button>
      <p className="mt-2 text-center text-xs text-muted dark:text-zinc-400">Secure payment by Stripe. Your card is saved for auto top up.</p>
    </section>
  );
}
