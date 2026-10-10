'use client';

import { useState } from 'react';
import { genSeconds, SHORT_VIDEO_MODELS, isShortVideoModel, type ShortDetailDto } from '../../../types/admin/shorts';
import { rerunShort, usd } from './useShorts';

/** Rough clip cost: every shot's generated seconds at the model's price. Null for a retired model. */
const clipEstimate = (short: ShortDetailDto): number | null => {
  if (!isShortVideoModel(short.videoModel)) return null;
  const model = short.videoModel;
  const secs = short.beats.reduce((sum, b) => sum + genSeconds(model, b.spanS), 0);
  return Math.round(secs * SHORT_VIDEO_MODELS[model].usdPerSecond * 1e6);
};

/** Shown while the short waits after the photos: go on to the paid video clips, or stop here. */
export function ClipsGatePanel({ short, token, onContinue }: { short: ShortDetailDto; token: string; onContinue: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (short.status !== 'AWAITING_CLIPS') return null;
  const estimate = clipEstimate(short);
  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      await rerunShort(token, short.id, 4);
      onContinue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the clips');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="space-y-3 rounded-xl border border-sky-300 bg-sky-50 p-4 shadow-sm md:p-5 dark:border-sky-800 dark:bg-sky-950/40">
      <div className="space-y-1">
        <h2 className="text-base font-extrabold text-app-ink">Paused before the video clips</h2>
        <p className="text-sm text-app-muted">
          Check the narration and the photos below. Make the clips only if they are good. Not good? Use “Run again” from step 1 or 3.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={go}
          disabled={busy}
          className="min-h-11 rounded-lg bg-app-ink px-4 text-sm font-bold text-app-panel transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
        >
          {busy ? 'Starting…' : 'Make video clips'}
        </button>
        <span className="text-xs text-app-muted tabular-nums">
          {short.beats.length} clips{estimate !== null ? ` · about ${usd(estimate)}` : ''}
        </span>
      </div>
      {error && <p className="text-xs text-app-danger">{error}</p>}
    </section>
  );
}
