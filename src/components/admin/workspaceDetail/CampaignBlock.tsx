'use client';

import { useState } from 'react';
import type { BlitzBankAudienceDto } from '../../../types/admin/workspaceDetail';

/** An audience's campaign: goal, the action a ready viewer takes, and its trigger bank (used lines struck through). */
export function CampaignBlock({ audience }: { audience: BlitzBankAudienceDto }) {
  const [open, setOpen] = useState(false);
  if (!audience.objective && audience.triggers.length === 0) {
    return <p className="text-xs text-muted">No campaign yet: it is written with the next stories.</p>;
  }
  const total = audience.triggers.reduce((n, l) => n + l.items.length, 0);
  const used = audience.triggers.reduce((n, l) => n + l.items.filter((i) => i.used).length, 0);
  return (
    <div className="rounded-xl border border-line bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Campaign goal</dt>
          <dd className="text-ink dark:text-zinc-100">{audience.objective || '—'}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Action asked</dt>
          <dd className="text-ink dark:text-zinc-100">{audience.action || '—'}</dd>
        </div>
      </dl>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-2 min-h-11 text-sm font-semibold text-blue-600 transition active:scale-95 dark:text-blue-400">
        {open ? 'Hide' : 'Show'} trigger bank · {used}/{total} used
      </button>
      {open && (
        <div className="mt-1 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {audience.triggers.map((list) => (
            <div key={list.label}>
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">{list.label}</span>
              <ul className="mt-1 space-y-0.5 text-sm">
                {list.items.map((item) => (
                  <li key={item.text} className={item.used ? 'text-muted line-through' : 'text-ink dark:text-zinc-200'}>{item.text}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
