'use client';

import { useState } from 'react';
import { adminFetch } from '../../business/useAdminApi';
import { Notice, Switch } from './credits/fields';

type Props = { token: string; on: boolean; onChanged: () => void };

/** Testing switch: Blitz cards on the Ideas page get stock photos, like a free account, even when paid. */
export function StockImagesToggle({ token, on, onChanged }: Props) {
  const [value, setValue] = useState(on);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = async (next: boolean) => {
    setBusy(true);
    setError(null);
    setValue(next);
    try {
      await adminFetch(token, '/api/slideshow/me', { method: 'PATCH', body: JSON.stringify({ stockImagesOnly: next }) });
      onChanged();
    } catch (err) {
      setValue(!next);
      setError(err instanceof Error ? err.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-line bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted dark:text-zinc-400">Testing</p>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink dark:text-zinc-100">Stock photos only</p>
          <p className="text-xs text-muted dark:text-zinc-400">New Ideas cards get free stock photos, like a free account. Slideshows do not change.</p>
        </div>
        <Switch on={value} onChange={(next) => void change(next)} label="Stock photos only" disabled={busy} />
      </div>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
