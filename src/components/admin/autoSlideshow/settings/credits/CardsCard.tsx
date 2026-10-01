'use client';

import { useState } from 'react';
import type { CardDto } from '../../../../../types/admin/slideshowCredits';
import { adminFetch } from '../../../business/useAdminApi';
import { cardClass, SectionTitle, secondaryButton } from './fields';

type Props = { token: string; workspaceId: string; cards: CardDto[]; autoCardId: string | null; disabled: boolean; onChanged: () => void };

const brandName = (brand: string) => (brand === 'amex' ? 'Amex' : brand.charAt(0).toUpperCase() + brand.slice(1));

function CardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

/** Saved cards (kept by Stripe), the one auto top up uses, and Add card / Remove. */
export function CardsCard({ token, workspaceId, cards, autoCardId, disabled, onChanged }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (key: string, task: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };
  const add = () =>
    run('add', async () => {
      const { url } = await adminFetch<{ url: string }>(token, '/api/slideshow/credits/cards', { method: 'POST', body: JSON.stringify({ workspaceId }) });
      window.location.assign(url);
    });
  const remove = (card: CardDto) => {
    if (!window.confirm(`Remove ${brandName(card.brand)} •••• ${card.last4}?`)) return;
    void run(card.id, async () => {
      await adminFetch(token, `/api/slideshow/credits/cards?id=${encodeURIComponent(card.id)}`, { method: 'DELETE' });
      onChanged();
    });
  };

  return (
    <section className={cardClass}>
      <SectionTitle title="Payment methods" hint="Cards saved for auto top up. Stripe keeps your card details, not us." />
      {cards.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted dark:border-zinc-700 dark:text-zinc-400">No card saved yet.</p>
      ) : (
        <ul className="space-y-2">
          {cards.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-xl border border-line p-3 dark:border-zinc-800">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-ink dark:bg-zinc-800 dark:text-zinc-100"><CardIcon /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink dark:text-zinc-100">{brandName(c.brand)} •••• {c.last4}</p>
                <p className="truncate text-xs text-muted dark:text-zinc-400">
                  Expires {String(c.expMonth).padStart(2, '0')}/{String(c.expYear).slice(-2)}
                  {c.id === autoCardId && ' · Used for auto top up'}
                </p>
              </div>
              <button type="button" onClick={() => remove(c)} disabled={busy !== null} className="min-h-10 shrink-0 rounded-full px-3 text-xs font-semibold text-muted transition hover:text-red-600 disabled:opacity-40">
                {busy === c.id ? 'Removing…' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      <button type="button" onClick={() => void add()} disabled={busy !== null || disabled} className={`${secondaryButton} mt-3 w-full`}>
        {busy === 'add' ? 'Opening…' : '+ Add card'}
      </button>
    </section>
  );
}
