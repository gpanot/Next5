'use client';

import { useState, type FormEvent } from 'react';
import { REASON_LABEL, usd, type AdminCreditUserDto, type CreditEntryDto } from '../../../types/admin/slideshowCredits';
import { adminFetch, useAdminApi } from '../business/useAdminApi';

type Props = { token: string; user: AdminCreditUserDto; onChanged: () => void; onClose: () => void };

const PRESETS = [199, 500, 1_000, 2_500];

/** Parses "5", "-2.50", "$10" into cents; null when it is not a money amount. */
const parseCents = (text: string): number | null => {
  const n = Number(text.trim().replace('$', ''));
  return Number.isFinite(n) && n !== 0 ? Math.round(n * 100) : null;
};

/** One user's balance, a form to add (or remove) credits by hand, and their last 50 changes. */
export function UserCreditsPanel({ token, user, onChanged, onClose }: Props) {
  const { data, error, loading, refresh } = useAdminApi<{ balanceCents: number; history: CreditEntryDto[] }>(token, `/api/admin/credits/${user.id}`);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const cents = parseCents(amount);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (cents === null || !note.trim() || busy) return;
    if (!window.confirm(`${cents > 0 ? 'Add' : 'Remove'} ${usd(Math.abs(cents))} ${cents > 0 ? 'to' : 'from'} ${user.email}?`)) return;
    setBusy(true);
    setMessage(null);
    try {
      const { balanceCents } = await adminFetch<{ balanceCents: number }>(token, '/api/admin/credits', { method: 'POST', body: JSON.stringify({ userId: user.id, amountCents: cents, note }) });
      setMessage({ ok: true, text: `Done. New balance: ${usd(balanceCents)}.` });
      setAmount('');
      setNote('');
      refresh();
      onChanged();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="rounded-2xl border border-line bg-white p-4 shadow-sm md:p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-ink dark:text-zinc-100">{user.displayName || user.email}</p>
          <p className="truncate text-[12px] text-muted">{user.email}</p>
        </div>
        <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-zinc-100 dark:hover:bg-zinc-800">✕</button>
      </div>

      <p className="mt-4 text-[11px] font-semibold tracking-widest text-muted uppercase">Balance</p>
      {loading && !data ? <div className="mt-1 h-9 w-28 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" /> : <p className="text-3xl font-extrabold text-ink dark:text-zinc-100">{usd(data?.balanceCents ?? 0)}</p>}

      <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p} type="button" onClick={() => setAmount((p / 100).toFixed(2))} className="min-h-10 rounded-xl border border-line px-3 text-[13px] font-medium text-ink transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800">
              +{usd(p)}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink dark:text-zinc-100">Amount in USD (negative removes)</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="10.00" className="min-h-11 w-full rounded-xl border border-line bg-white px-3 text-base text-ink dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink dark:text-zinc-100">Note (shown to the user)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Sorry for the failed post" className="min-h-11 w-full rounded-xl border border-line bg-white px-3 text-base text-ink dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" />
        </label>
        {message && <p className={`text-[13px] ${message.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{message.text}</p>}
        <button type="submit" disabled={cents === null || !note.trim() || busy} className="min-h-11 w-full rounded-xl bg-ink px-4 text-[13px] font-semibold text-white transition active:scale-95 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900">
          {busy ? 'Saving…' : cents !== null && cents < 0 ? `Remove ${usd(-cents)}` : `Add ${usd(cents ?? 0)}`}
        </button>
      </form>

      <p className="mt-6 mb-2 text-[11px] font-semibold tracking-widest text-muted uppercase">History</p>
      {error && <p className="text-[13px] text-red-600">{error}</p>}
      {data && data.history.length === 0 && <p className="text-[13px] text-muted">No activity yet.</p>}
      <ul className="divide-y divide-line dark:divide-zinc-800">
        {data?.history.map((e) => (
          <li key={e.id} className="flex items-center gap-3 py-2 text-[13px]">
            <div className="min-w-0 flex-1">
              <p className="truncate text-ink dark:text-zinc-100">{REASON_LABEL[e.reason]}{e.note ? ` · ${e.note}` : ''}</p>
              <p className="text-[11px] text-muted">{new Date(e.createdAt).toLocaleString()}</p>
            </div>
            <span className={`shrink-0 font-semibold tabular-nums ${e.deltaCents >= 0 ? 'text-emerald-600' : 'text-ink dark:text-zinc-100'}`}>{e.deltaCents >= 0 ? '+' : ''}{usd(e.deltaCents)}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
