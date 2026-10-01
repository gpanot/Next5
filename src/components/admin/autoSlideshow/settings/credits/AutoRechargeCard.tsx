'use client';

import { useState } from 'react';
import {
  MAX_THRESHOLD_CENTS,
  MAX_TOPUP_CENTS,
  MIN_THRESHOLD_CENTS,
  MIN_TOPUP_CENTS,
  dollarsToCents,
  usd,
  type AutoRechargeDto,
  type CardDto,
} from '../../../../../types/admin/slideshowCredits';
import { adminFetch } from '../../../business/useAdminApi';
import { cardClass, MoneyInput, Notice, primaryButton, Switch } from './fields';

type Props = { token: string; settings: AutoRechargeDto; cards: CardDto[]; onSaved: () => void };

const inRange = (cents: number | null, min: number, max: number) => cents !== null && cents >= min && cents <= max;

/** Auto top up: when the balance drops below X, charge the saved card Y. */
export function AutoRechargeCard({ token, settings, cards, onSaved }: Props) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [threshold, setThreshold] = useState(String(settings.thresholdCents / 100));
  const [amount, setAmount] = useState(String(settings.amountCents / 100));
  const [cardId, setCardId] = useState(settings.paymentMethodId ?? cards[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const thresholdCents = dollarsToCents(threshold);
  const amountCents = dollarsToCents(amount);
  const valid = inRange(thresholdCents, MIN_THRESHOLD_CENTS, MAX_THRESHOLD_CENTS) && inRange(amountCents, MIN_TOPUP_CENTS, MAX_TOPUP_CENTS);
  const noCard = cards.length === 0;

  const save = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const body = { enabled, thresholdCents, amountCents, paymentMethodId: cardId || undefined };
      await adminFetch(token, '/api/slideshow/credits/auto-recharge', { method: 'PUT', body: JSON.stringify(body) });
      setMessage({ ok: true, text: enabled ? 'Auto top up is on.' : 'Auto top up is off.' });
      onSaved();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Could not save' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={cardClass}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-ink dark:text-zinc-100">Auto top up</h3>
          <p className="mt-0.5 text-xs text-muted dark:text-zinc-400">{noCard ? 'Add a card below to turn this on.' : 'Never run out. Turn it off any time.'}</p>
        </div>
        <Switch on={enabled} onChange={setEnabled} label="Auto top up" disabled={noCard && !enabled} />
      </div>
      {settings.error && <div className="mt-3"><Notice tone="error">Last auto top up failed: {settings.error}</Notice></div>}
      {enabled && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <MoneyInput id="auto-threshold" label="When balance drops below" value={threshold} onChange={setThreshold} hint={`${usd(MIN_THRESHOLD_CENTS)} minimum.`} />
            <MoneyInput id="auto-amount" label="Add this amount" value={amount} onChange={setAmount} hint={`${usd(MIN_TOPUP_CENTS)} to ${usd(MAX_TOPUP_CENTS)}.`} />
          </div>
          {cards.length > 1 && (
            <div>
              <label htmlFor="auto-card" className="mb-1 block text-xs font-semibold text-ink dark:text-zinc-100">Card to charge</label>
              <select id="auto-card" value={cardId} onChange={(e) => setCardId(e.target.value)} className="min-h-11 w-full rounded-xl border border-line bg-white px-3 text-base text-ink dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
                {cards.map((c) => <option key={c.id} value={c.id}>{c.brand.toUpperCase()} •••• {c.last4}</option>)}
              </select>
            </div>
          )}
          <p className="text-xs text-muted dark:text-zinc-400">By saving, you let Next5 charge your card when your balance gets low. Credits are added once Stripe confirms the payment.</p>
        </div>
      )}
      {message && <div className="mt-3"><Notice tone={message.ok ? 'ok' : 'error'}>{message.text}</Notice></div>}
      <button type="button" onClick={() => void save()} disabled={busy || (enabled && !valid)} className={`${primaryButton} mt-4 w-full`}>
        {busy ? 'Saving…' : 'Save'}
      </button>
    </section>
  );
}
