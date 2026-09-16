'use client';

import { useMemo, useState } from 'react';

export type BenchModelDto = { id: string; label: string; family: string; note: string; price: number; maxImages: number; keepsInputShape: boolean };

const money = (micros: number) => `$${(micros / 1_000_000).toFixed(3)}`;

/** Every WaveSpeed editing model, with a search box and a vendor filter — there are about a hundred. */
export const ModelPicker = ({ models, selected, onChange }: { models: BenchModelDto[]; selected: string[]; onChange: (next: string[]) => void }) => {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('all');

  const families = useMemo(() => ['all', ...[...new Set(models.map((m) => m.family))].sort()], [models]);
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return models.filter((m) => (family === 'all' || m.family === family) && (!needle || `${m.label} ${m.id} ${m.note}`.toLowerCase().includes(needle)));
  }, [models, query, family]);

  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((m) => m !== id) : [...selected, id]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[12px] font-medium text-muted">Models ({selected.length} selected of {models.length})</p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a model…"
          aria-label="Search a model"
          className="w-56 rounded-lg border border-line px-3 py-1.5 text-[13px] text-ink"
        />
        {selected.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="rounded-lg border border-line px-3 py-1.5 text-[12px] text-ink">Clear</button>
        )}
        <button type="button" onClick={() => onChange(shown.map((m) => m.id))} className="rounded-lg border border-line px-3 py-1.5 text-[12px] text-ink">Select these {shown.length}</button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {families.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setFamily(name)}
            className={`rounded-full border px-3 py-1 text-[12px] capitalize transition-colors ${family === name ? 'border-ink bg-ink text-white' : 'border-line text-muted hover:border-ink/40'}`}
          >
            {name === 'all' ? 'All' : name}
          </button>
        ))}
      </div>

      <div className="grid max-h-96 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
        {shown.map((m) => {
          const on = selected.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(m.id)}
              title={m.note}
              className={`flex flex-col gap-0.5 rounded-xl border px-3 py-2 text-left transition-colors ${on ? 'border-ink bg-surface-alt' : 'border-line hover:border-ink/40'}`}
            >
              <span className="text-[13px] font-medium text-ink">{m.label} · {money(m.price)}</span>
              <span className="truncate text-[11px] text-muted">{m.id}</span>
              {m.keepsInputShape && <span className="text-[11px] text-amber-700">keeps the input shape</span>}
            </button>
          );
        })}
        {shown.length === 0 && <p className="text-[13px] text-muted">No model matches that search.</p>}
      </div>
    </div>
  );
};
