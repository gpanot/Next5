'use client';

import { useState } from 'react';
import { adminFetch } from '../../business/useAdminApi';
import { Notice, Switch } from './credits/fields';

type Values = { stockImagesOnly: boolean; aiImagesOnly: boolean };
type Props = { token: string; values: Values; onChanged: () => void };

const SWITCHES: { key: keyof Values; title: string; hint: string }[] = [
  { key: 'stockImagesOnly', title: 'Stock photos only', hint: 'New Ideas cards get free stock photos, like a free account. Slideshows do not change.' },
  { key: 'aiImagesOnly', title: 'Only AI images for Blitz', hint: 'New Blitz cards always get AI images, even before any payment. Slideshows do not change.' },
];

/** Testing switches for Blitz card images: force stock photos or force AI images. Turning one on turns the other off. */
export function ImageTestSwitches({ token, values, onChanged }: Props) {
  const [state, setState] = useState<Values>(values);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = async (key: keyof Values, next: boolean) => {
    const before = state;
    setBusy(true);
    setError(null);
    setState(next ? { stockImagesOnly: false, aiImagesOnly: false, [key]: true } : { ...state, [key]: false });
    try {
      const saved = await adminFetch<Values>(token, '/api/slideshow/me', { method: 'PATCH', body: JSON.stringify({ [key]: next }) });
      setState(saved);
      onChanged();
    } catch (err) {
      setState(before);
      setError(err instanceof Error ? err.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-line bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted dark:text-zinc-400">Testing</p>
      {SWITCHES.map(({ key, title, hint }) => (
        <div key={key} className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink dark:text-zinc-100">{title}</p>
            <p className="text-xs text-muted dark:text-zinc-400">{hint}</p>
          </div>
          <Switch on={state[key]} onChange={(next) => void change(key, next)} label={title} disabled={busy} />
        </div>
      ))}
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
