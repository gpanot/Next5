'use client';

import { useEffect, useRef, useState } from 'react';
import { adminFetch } from './useAdminApi';

export type RunItemDto = {
  id: string;
  model: string;
  label: string;
  status: string;
  url: string | null;
  error: string | null;
  seconds: number | null;
  costUsdMicros: number;
};

export type RunDto = {
  id: string;
  label: string | null;
  prompt: string;
  shot: string;
  format: string;
  resolution: string;
  productName: string | null;
  createdAt: string;
  inputUrls: string[];
  items: RunItemDto[];
};

const POLL_MS = 4_000;
const money = (micros: number) => `$${(micros / 1_000_000).toFixed(3)}`;

/** One bench run: the inputs, then every model's photo with its time and price. Polls while models are working. */
export const ModelTestRunCard = ({ token, run, onUpdate, onDelete }: { token: string; run: RunDto; onUpdate: (run: RunDto) => void; onDelete: () => void }) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const working = run.items.some((i) => i.status === 'generating');
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  });

  useEffect(() => {
    if (!working) return;
    let stopped = false;
    const tick = async () => {
      const res = await adminFetch<{ run: RunDto }>(token, `/api/admin/model-tests/${run.id}`).catch(() => null);
      if (!stopped && res?.run) onUpdateRef.current(res.run);
    };
    const id = window.setInterval(() => void tick(), POLL_MS);
    void tick();
    return () => { stopped = true; window.clearInterval(id); };
  }, [token, run.id, working]);

  const done = run.items.filter((i) => i.status === 'ready');
  const totalCost = run.items.reduce((sum, i) => sum + i.costUsdMicros, 0);
  const fastest = done.length ? Math.min(...done.map((i) => i.seconds ?? Infinity)) : null;
  const cheapest = done.length ? Math.min(...done.map((i) => i.costUsdMicros)) : null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-ink">{run.label || run.productName || 'Test run'} · {run.shot} · {run.format} · {run.resolution}</h3>
          <p className="text-[12px] text-muted">
            {new Date(run.createdAt).toLocaleString()} · {done.length}/{run.items.length} done · {money(totalCost)} so far
            {working ? ' · still working…' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowPrompt((v) => !v)} className="rounded-lg border border-line px-3 py-1.5 text-[12px] text-ink">{showPrompt ? 'Hide prompt' : 'Show prompt'}</button>
          <button type="button" onClick={onDelete} className="rounded-lg border border-line px-3 py-1.5 text-[12px] text-red-700">Delete</button>
        </div>
      </div>

      {showPrompt && <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-surface-alt p-3 text-[12px] text-ink">{run.prompt}</pre>}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {run.inputUrls.map((url) => (
          // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
          <img key={url} src={url} alt="Input" className="h-24 w-24 shrink-0 rounded-lg object-cover ring-1 ring-line" />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {run.items.map((item) => (
          <figure key={item.id} className="flex flex-col overflow-hidden rounded-xl border border-line">
            <div className="relative aspect-square bg-surface-alt">
              {item.url && (
                // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
                <img src={item.url} alt={item.label} className="h-full w-full object-cover" />
              )}
              {item.status === 'generating' && <span className="absolute inset-0 flex items-center justify-center text-[12px] text-muted">Working…</span>}
              {item.status === 'failed' && <span className="absolute inset-0 flex items-center justify-center px-3 text-center text-[11px] text-red-700">{item.error ?? 'Failed'}</span>}
            </div>
            <figcaption className="flex flex-col gap-0.5 p-2">
              <span className="text-[12px] font-medium text-ink">{item.label}</span>
              <span className="text-[11px] text-muted">
                {item.seconds !== null ? `${item.seconds}s` : '—'} · {money(item.costUsdMicros)}
                {item.status === 'ready' && item.seconds !== null && item.seconds === fastest ? ' · fastest' : ''}
                {item.status === 'ready' && item.costUsdMicros === cheapest ? ' · cheapest' : ''}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
};
