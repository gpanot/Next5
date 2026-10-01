'use client';

import type { ReactNode } from 'react';

export const cardClass = 'rounded-xl border border-line bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900';
export const primaryButton =
  'min-h-11 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-40 dark:bg-blue-500 dark:hover:bg-blue-400';
export const secondaryButton =
  'min-h-11 rounded-full border border-line px-5 text-sm font-semibold text-ink transition hover:bg-zinc-50 active:scale-95 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800';

export function SectionTitle({ title, hint }: { title: string; hint?: ReactNode }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-bold text-ink dark:text-zinc-100">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-muted dark:text-zinc-400">{hint}</p>}
    </div>
  );
}

type MoneyInputProps = { id: string; label: string; value: string; onChange: (v: string) => void; hint?: string };

/** Whole-dollar field with a "$" prefix; numeric keypad on phones. */
export function MoneyInput({ id, label, value, onChange, hint }: MoneyInputProps) {
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-ink dark:text-zinc-100">{label}</label>
      <div className="flex min-h-11 items-center rounded-xl border border-line bg-white px-3 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 dark:border-zinc-700 dark:bg-zinc-950">
        <span aria-hidden className="text-sm text-muted">$</span>
        <input
          id={id}
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
          className="ml-1.5 w-full bg-transparent text-base text-ink outline-none dark:text-zinc-100"
        />
      </div>
      {hint && <p className="mt-1 text-xs text-muted dark:text-zinc-400">{hint}</p>}
    </div>
  );
}

/** On/off switch with a 44px touch target. */
export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center disabled:opacity-40"
    >
      <span className={`relative h-6 w-11 rounded-full transition-colors ${on ? 'bg-blue-600 dark:bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  );
}

export function Notice({ tone, children }: { tone: 'ok' | 'error' | 'info'; children: ReactNode }) {
  const tones = {
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
    error: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
    info: 'border-line bg-zinc-50 text-muted dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400',
  };
  return <p role="status" className={`rounded-xl border p-3 text-sm ${tones[tone]}`}>{children}</p>;
}
