'use client';

/** Hooks to test on the image: proven templates filled for the brand, pre-rendered. Tapping one swaps the ad's image. */
import { useState } from 'react';
import { HOOK_FORMAT_LABELS } from '../../../config/metaAdsHooks';
import type { AdHook, MetaAdDto } from '../../../types/admin/metaAds';
import { adminFetch } from '../business/useAdminApi';

/** `onPreview`: shows an image in the modal at once, before the run reloads. */
type Props = { token: string; runId: string; ad: MetaAdDto; canEdit: boolean; onChanged: () => void; onPreview: (url: string) => void };

const formatLabel = (hook: AdHook) => (hook.format === 'original' ? 'Original' : HOOK_FORMAT_LABELS[hook.format]);

function Spinner() {
  return <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-zinc-300 border-t-ink dark:border-zinc-600 dark:border-t-zinc-100" />;
}

function HookRow({ hook, active, busy, disabled, onPick }: { hook: AdHook; active: boolean; busy: boolean; disabled: boolean; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      disabled={disabled || active}
      title={hook.template || undefined}
      className={[
        'flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition active:scale-[0.99]',
        active
          ? 'border-blue-600 bg-blue-50 text-ink dark:border-blue-400 dark:bg-blue-950/60 dark:text-zinc-100'
          : 'border-line bg-white text-ink hover:border-zinc-300 hover:shadow-sm disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600',
      ].join(' ')}
    >
      <span className="w-24 shrink-0 text-[10px] font-bold tracking-wider text-muted uppercase dark:text-zinc-500">{formatLabel(hook)}</span>
      <span className="flex-1 font-semibold">{hook.text}</span>
      {busy ? <Spinner /> : active && <span className="shrink-0 text-blue-600 dark:text-blue-400">✓</span>}
    </button>
  );
}

export function HookPicker({ token, runId, ad, canEdit, onChanged, onPreview }: Props) {
  const [fresh, setFresh] = useState<AdHook[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Polled hooks carry the pre-rendered image URLs; freshly written ones are used until the poll catches up.
  const polledMatch = fresh && ad.hooks?.length === fresh.length && fresh.every((h, i) => ad.hooks?.[i]?.text === h.text);
  const hooks = fresh && !polledMatch ? fresh : ad.hooks;
  const base = `/api/admin/meta-ads/runs/${runId}/ads/${ad.id}/hooks`;

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      setFresh((await adminFetch<{ hooks: AdHook[] }>(token, base, { method: 'POST' })).hooks);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not write hooks');
    } finally {
      setGenerating(false);
    }
  };

  const pick = async (hook: AdHook) => {
    const previous = picked;
    setPicked(hook.id);
    setError(null);
    // Pre-rendered: show it now. Otherwise the server renders it (a second or two) and the spinner shows meanwhile.
    const ready = hook.imageUrl;
    if (ready) onPreview(ready);
    else setSaving(hook.id);
    try {
      const { finalUrl } = await adminFetch<{ finalUrl: string | null }>(token, base, { method: 'PUT', body: JSON.stringify({ hookId: hook.id }) });
      if (finalUrl) onPreview(finalUrl);
      onChanged();
    } catch (err) {
      setPicked(previous);
      setError(err instanceof Error ? err.message : 'Could not change the hook');
    } finally {
      setSaving(null);
    }
  };

  const activeId = picked ?? hooks?.find((h) => h.text === ad.overlayText)?.id ?? null;

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <span className="text-[10px] font-bold tracking-wider text-muted uppercase">Hooks to test</span>
        {hooks && canEdit && (
          <button onClick={() => void generate()} disabled={generating} className="min-h-8 text-[11px] font-medium text-muted transition hover:text-ink disabled:opacity-50 dark:hover:text-zinc-100">
            {generating ? 'Writing…' : '↻ New hooks'}
          </button>
        )}
      </div>
      {!hooks ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-muted dark:text-zinc-400">Proven hook formats, filled for your brand. Tap one to put it on the image.</p>
          <button
            onClick={() => void generate()}
            disabled={generating || !canEdit}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {generating && <Spinner />}
            {generating ? 'Writing hooks…' : 'Get 15 hooks'}
          </button>
        </div>
      ) : (
        <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
          {hooks.map((hook) => (
            <HookRow
              key={hook.id}
              hook={hook}
              active={hook.id === activeId}
              busy={saving === hook.id}
              disabled={!canEdit || ad.status !== 'ready'}
              onPick={() => void pick(hook)}
            />
          ))}
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}
