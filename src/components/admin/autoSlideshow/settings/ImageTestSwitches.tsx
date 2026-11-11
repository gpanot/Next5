'use client';

import { useState } from 'react';
import { adminFetch } from '../../business/useAdminApi';
import { Notice, Switch } from './credits/fields';

type Values = { stockImagesOnly: boolean; hooksVolumeStockOnly: boolean; splitSlidesPercent: number };
type SwitchKey = 'stockImagesOnly' | 'hooksVolumeStockOnly';
type Props = { token: string; values: Values; onChanged: () => void };

const SWITCHES: { key: SwitchKey; title: string; hint: string }[] = [
  { key: 'stockImagesOnly', title: 'Stock photos only', hint: 'New Ideas cards get cheap AI images, like a free account. Slideshows do not change.' },
  { key: 'hooksVolumeStockOnly', title: 'Images for Hooks Volume: stock only', hint: 'Off: AI images once paid, stock before. On: "Generate the entire slideshows" always uses stock photos.' },
];

const SPLIT_PERCENTS = [10, 20, 30, 50];

/** Testing settings: Blitz card images (force stock), Hooks Volume images (force stock), and the 50/50 split slides share. */
export function ImageTestSwitches({ token, values, onChanged }: Props) {
  const [state, setState] = useState<Values>(values);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = async (patch: Partial<Values>) => {
    const before = state;
    setBusy(true);
    setError(null);
    setState({ ...state, ...patch });
    try {
      const saved = await adminFetch<Partial<Values>>(token, '/api/slideshow/me', { method: 'PATCH', body: JSON.stringify(patch) });
      setState((s) => ({ ...s, ...saved }));
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
          <Switch on={state[key]} onChange={(next) => void change({ [key]: next })} label={title} disabled={busy} />
        </div>
      ))}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="split-slides" className="text-sm font-semibold text-ink dark:text-zinc-100">50/50 split slides</label>
          <p className="text-xs text-muted dark:text-zinc-400">Share of Blitz images made as two stacked scenes. Applies from the second Blitz batch after a change: photo prompts are written one batch ahead.</p>
        </div>
        <select
          id="split-slides"
          value={state.splitSlidesPercent}
          disabled={busy}
          onChange={(e) => void change({ splitSlidesPercent: Number(e.target.value) })}
          className="min-h-11 shrink-0 rounded-xl border border-line bg-white px-3 text-base text-ink transition disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        >
          {SPLIT_PERCENTS.map((p) => <option key={p} value={p}>{p}%</option>)}
        </select>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
