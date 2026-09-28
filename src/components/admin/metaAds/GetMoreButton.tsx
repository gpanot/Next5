'use client';

import { useEffect, useRef, useState } from 'react';
import { DEMO_AD_COUNTS } from '../../../types/admin/metaAds';
import { adminFetch } from '../business/useAdminApi';

type Props = { token: string; url: string; onRun: (runId: string) => void };

/** Demo "Get 500 / month" CTA: asks how many ads, then starts a small new run for the same site. */
export function GetMoreButton({ token, url, onRun }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const start = async (adCount: number) => {
    setBusy(adCount);
    setError(null);
    try {
      const { runId } = await adminFetch<{ runId: string }>(token, '/api/admin/meta-ads/runs', { method: 'POST', body: JSON.stringify({ url, adCount }) });
      onRun(runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start');
      setBusy(null);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-10 items-center gap-1 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 hover:shadow-md active:scale-95"
      >
        Get 500 / month <span aria-hidden>→</span>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-60 rounded-xl border border-line bg-white p-3 text-left shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-2 text-xs font-semibold text-ink dark:text-zinc-100">How many ads do you want?</p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_AD_COUNTS.map((n) => (
              <button
                key={n}
                onClick={() => void start(n)}
                disabled={busy !== null}
                className="min-h-11 rounded-lg border border-line text-sm font-semibold text-ink transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-blue-950"
              >
                {busy === n ? '…' : n}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted">Starts a new run for this site. Demo only — no billing.</p>
          {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
