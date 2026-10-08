'use client';

import { useMemo, useState } from 'react';
import type { BankCta, BankMatrixDto, BankUseDto } from '../../../../types/admin/slideshowBank';
import { useAdminApi } from '../../business/useAdminApi';
import { MeatCard } from './MeatCard';
import { indexUses, type HookFilter, type OpenUse, type UseIndex } from './matrixUse';
import { UsedChips } from './UsedChips';

type Props = { token: string; runId: string; onClose: () => void; onOpenSlideshow: (slideshowId: string) => void };

const FILTERS: { id: HookFilter; label: string }[] = [
  { id: 'all', label: 'All hooks' },
  { id: 'used', label: 'Used' },
  { id: 'unused', label: 'Not used' },
];

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span className="rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
      <span className="block text-lg font-extrabold text-ink tabular-nums dark:text-zinc-100">{value}</span>
      <span className="block text-xs text-muted">{label}</span>
    </span>
  );
}

function CtaList({ ctas, uses, runId, onOpen }: { ctas: BankCta[]; uses: UseIndex; runId: string; onOpen: OpenUse }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-bold text-ink dark:text-zinc-100">Last slides (CTAs)</h3>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ctas.map((c) => (
          <li key={c.id} className="space-y-2 rounded-xl border border-line bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{c.angle}</span>
            <span className="block text-sm font-semibold text-ink dark:text-zinc-100">{c.title}</span>
            {c.body && <span className="block text-sm text-muted">{c.body}</span>}
            <UsedChips uses={uses.ctas.get(c.id) ?? []} runId={runId} onOpen={onOpen} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The matrix itself (stats, CTAs, topics and hooks); also shown on the admin workspace page. */
export function MatrixBody({ matrix, runId, onOpen }: { matrix: BankMatrixDto; runId: string; onOpen: OpenUse }) {
  const [filter, setFilter] = useState<HookFilter>('all');
  const uses = useMemo(() => indexUses(matrix.used), [matrix.used]);
  const bank = matrix.bank;
  if (!bank) return <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted dark:border-zinc-700">The matrix is made with the first slideshows. Come back once they are planned.</p>;
  const combos = bank.meats.reduce((n, m) => n + bank.hooks.filter((h) => h.meatId === m.id).length, 0) * bank.ctas.length;
  const usedCombos = new Set(matrix.used.map((u) => `${u.meatId}|${u.hookId}|${u.ctaId}`)).size;
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Built once for this website. Each slideshow = 1 topic + 1 hook + 1 last slide. New slideshows pick the least-used parts, then make fresh photos.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat value={bank.meats.length} label="topics" />
        <Stat value={bank.hooks.length} label="hooks" />
        <Stat value={bank.ctas.length} label="last slides" />
        <Stat value={combos} label="possible slideshows" />
        <Stat value={usedCombos} label="used" />
      </div>
      <CtaList ctas={bank.ctas} uses={uses} runId={runId} onOpen={onOpen} />
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-ink dark:text-zinc-100">Topics and their hooks</h3>
          <div role="radiogroup" aria-label="Show hooks" className="flex gap-1 rounded-full bg-zinc-100 p-1 dark:bg-zinc-800">
            {FILTERS.map((f) => (
              <button key={f.id} role="radio" aria-checked={filter === f.id} onClick={() => setFilter(f.id)} className="min-h-9 rounded-full px-3 text-xs font-semibold text-muted transition aria-checked:bg-white aria-checked:text-ink aria-checked:shadow-sm dark:aria-checked:bg-zinc-950 dark:aria-checked:text-zinc-100">
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {bank.meats.map((m) => (
          <MeatCard key={m.id} meat={m} hooks={bank.hooks.filter((h) => h.meatId === m.id)} uses={uses} filter={filter} runId={runId} onOpen={onOpen} />
        ))}
      </section>
    </div>
  );
}

/** Big pop-up with the site's Slideshow Bank: every topic, hook and last slide, and which slideshows used each. */
export function MatrixDialog({ token, runId, onClose, onOpenSlideshow }: Props) {
  const { data, error, loading } = useAdminApi<{ matrix: BankMatrixDto }>(token, `/api/admin/auto-slideshow/runs/${runId}/bank`);
  const open = (use: BankUseDto) => {
    onClose();
    onOpenSlideshow(use.slideshowId);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Slideshow matrix" onClick={(e) => e.stopPropagation()} className="flex h-[92dvh] w-full max-w-5xl flex-col rounded-t-2xl bg-surface shadow-xl sm:h-[88dvh] sm:rounded-2xl dark:bg-zinc-950">
        <header className="flex items-center gap-3 border-b border-line p-4 dark:border-zinc-800">
          <h2 className="flex-1 text-base font-extrabold text-ink dark:text-zinc-100">Slideshow matrix</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-zinc-100 dark:hover:bg-zinc-800">✕</button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p>}
          {loading && !data && !error && (
            <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}</div>
          )}
          {data && <MatrixBody matrix={data.matrix} runId={runId} onOpen={open} />}
        </div>
      </div>
    </div>
  );
}
