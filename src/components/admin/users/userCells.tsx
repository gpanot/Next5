'use client';

import type { EmailKind } from '../../../lib/emailDomain';
import { SLIDESHOW_PRICE_CENTS, usd } from '../../../types/admin/slideshowCredits';

export type UserCredits = { balanceCents: number | null; usedCents: number; purchasedCents: number; givenCents: number };

export type EmailFilter = 'all' | 'business' | 'suspicious';

export const EMAIL_FILTERS: { id: EmailFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'business', label: 'Business email' },
  { id: 'suspicious', label: 'Suspicious' },
];

export const matchesEmailFilter = (kind: EmailKind, filter: EmailFilter): boolean =>
  filter === 'all' || (filter === 'business' ? kind === 'business' : kind !== 'business');

/** Credits are whole posts: 897 cents → "3". A partial credit shows one decimal. */
const credits = (cents: number): string => {
  const n = cents / SLIDESHOW_PRICE_CENTS;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
};

/** Shown next to an email from a personal or throwaway inbox: Next5 is for businesses. */
export function EmailFlag({ kind }: { kind: EmailKind }) {
  if (kind === 'business') return null;
  const label = kind === 'disposable' ? 'Throwaway email' : 'Personal email';
  return (
    <span title="Not a business email address" className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
      ⚠ {label}
    </span>
  );
}

/** Credits left, used and purchased; the dollar amount shows on hover. */
export function CreditCells({ credits: c, Td }: { credits: UserCredits; Td: (p: { children?: React.ReactNode; className?: string }) => React.ReactNode }) {
  return (
    <>
      <Td className="tabular-nums">
        {c.balanceCents === null ? <span className="text-muted">—</span> : <span title={usd(c.balanceCents)} className={c.balanceCents < 0 ? 'text-red-600' : 'font-semibold text-ink'}>{credits(c.balanceCents)}</span>}
      </Td>
      <Td className="tabular-nums"><span title={usd(c.usedCents)}>{credits(c.usedCents)}</span></Td>
      <Td className="tabular-nums">
        {c.purchasedCents > 0 ? <span title={`${credits(c.purchasedCents)} credits`} className="font-semibold text-emerald-700 dark:text-emerald-400">{usd(c.purchasedCents)}</span> : <span className="text-muted">—</span>}
      </Td>
    </>
  );
}

export function EmailFilterChips({ value, onChange, counts }: { value: EmailFilter; onChange: (f: EmailFilter) => void; counts: Record<EmailFilter, number> }) {
  return (
    <div role="radiogroup" aria-label="Filter by email" className="flex flex-wrap gap-2">
      {EMAIL_FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          role="radio"
          aria-checked={value === f.id}
          onClick={() => onChange(f.id)}
          className="min-h-9 rounded-full border border-line px-3 text-[12px] font-medium text-muted transition hover:border-ink/30 aria-checked:border-ink aria-checked:bg-ink aria-checked:text-white dark:border-zinc-700 dark:aria-checked:border-zinc-100 dark:aria-checked:bg-zinc-100 dark:aria-checked:text-zinc-900"
        >
          {f.label} <span className="tabular-nums opacity-70">{counts[f.id]}</span>
        </button>
      ))}
    </div>
  );
}
