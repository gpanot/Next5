'use client';

import { Lock, Shuffle } from 'lucide-react';
import type { RemixLayer } from './api';

type Props = {
  /** Locked layers; empty = Random. */
  locks: RemixLayer[];
  /** Toggles one layer; null = Random (clear). */
  onToggleLock: (layer: RemixLayer | null) => void;
  onRemix: () => void;
  busy: boolean;
  disabledReason: string | null;
  error: string | null;
  result: { locked: RemixLayer[]; reason: string; usedVectors: boolean } | null;
};

const LOCK_OPTIONS: { id: RemixLayer | null; label: string }[] = [
  { id: null, label: 'Random' },
  { id: 'caption', label: 'Caption' },
  { id: 'overlay', label: 'Meme' },
  { id: 'background', label: 'Background' },
  { id: 'audio', label: 'Audio' },
];

const layerLabel = (layer: RemixLayer) => LOCK_OPTIONS.find((o) => o.id === layer)?.label ?? layer;

/** "Remix it!": keep one or more layers, let the AI find a new combination of the others. */
export function RemixItPanel({ locks, onToggleLock, onRemix, busy, disabledReason, error, result }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-muted">
          <Lock aria-hidden className="h-3.5 w-3.5" /> Keep these layers
          <span className="font-normal text-subtle">· pick one or more</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {LOCK_OPTIONS.map((o) => {
            const on = o.id === null ? locks.length === 0 : locks.includes(o.id);
            return (
              <button
                key={o.label}
                type="button"
                onClick={() => onToggleLock(o.id)}
                aria-pressed={on}
                className={[
                  'min-h-9 rounded-full px-3 text-[12px] transition-colors',
                  on ? 'bg-orange-500 text-white' : 'bg-white text-muted ring-1 ring-line hover:text-ink dark:bg-neutral-800',
                ].join(' ')}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onRemix}
        disabled={busy || Boolean(disabledReason)}
        title={disabledReason ?? undefined}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-[14px] font-semibold text-white shadow-sm transition-all hover:bg-orange-600 active:scale-[0.98] disabled:opacity-40"
      >
        {busy
          ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          : <Shuffle aria-hidden className="h-4 w-4" />}
        {busy ? 'Remixing…' : 'Remix it!'}
      </button>

      {disabledReason && !busy && <p className="text-[11px] text-muted">{disabledReason}</p>}
      {error && <p className="text-[12px] text-red-700 dark:text-red-400">{error}</p>}
      {result && !error && (
        <p className="rounded-xl bg-orange-50 px-3 py-2 text-[12px] text-ink dark:bg-orange-950/40">
          <span className="font-semibold">Kept {result.locked.map(layerLabel).join(' + ')}.</span> {result.reason}
          {!result.usedVectors && <span className="mt-1 block text-[11px] text-muted">Random picks — no vector match available.</span>}
        </p>
      )}
    </div>
  );
}
