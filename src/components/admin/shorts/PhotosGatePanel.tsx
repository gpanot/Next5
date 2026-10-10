'use client';

import { useState } from 'react';
import { DEFAULT_PHOTO_MODEL, SHORT_PHOTO_MODELS, isShortPhotoModel, type ShortDetailDto, type ShortPhotoModel } from '../../../types/admin/shorts';
import { rerunShort, usd } from './useShorts';

const MODELS = Object.entries(SHORT_PHOTO_MODELS) as [ShortPhotoModel, (typeof SHORT_PHOTO_MODELS)[ShortPhotoModel]][];

/** Photos a run makes: one per shot plus the anchor when the brand has a Visual Bible (retries not counted). */
const photoCount = (short: ShortDetailDto) => (short.attempts.at(-1)?.script.mechanismLines.length ?? 0) + 2 + (short.inputs?.visualBible ? 1 : 0);

/** Shown while the short waits after the voice: pick the photo model (1K, 9:16), then make the photos. */
export function PhotosGatePanel({ short, token, onContinue }: { short: ShortDetailDto; token: string; onContinue: () => void }) {
  const [model, setModel] = useState<ShortPhotoModel>(short.inputs?.photoModel ?? DEFAULT_PHOTO_MODEL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (short.status !== 'AWAITING_PHOTOS') return null;
  const count = photoCount(short);
  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      await rerunShort(token, short.id, 3, model);
      onContinue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the photos');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="space-y-3 rounded-xl border border-sky-300 bg-sky-50 p-4 shadow-sm md:p-5 dark:border-sky-800 dark:bg-sky-950/40">
      <div className="space-y-1">
        <h2 className="text-base font-extrabold text-app-ink">Paused before the photos</h2>
        <p className="text-sm text-app-muted">Pick the photo model. Every photo is 1K, 9:16. The short stops again before the video clips.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="photo-model">Photo model</label>
        <select
          id="photo-model"
          value={model}
          onChange={(e) => isShortPhotoModel(e.target.value) && setModel(e.target.value)}
          className="min-h-11 rounded-lg border border-app-line bg-app-panel px-3 text-sm text-app-ink transition focus:border-app-ink focus:outline-none"
        >
          {MODELS.map(([key, m]) => (
            <option key={key} value={key}>
              {m.label}{key === DEFAULT_PHOTO_MODEL ? ' (current)' : ''} · ${m.usdPerPhoto.toFixed(3)} a photo
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={go}
          disabled={busy}
          className="min-h-11 rounded-lg bg-app-ink px-4 text-sm font-bold text-app-panel transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
        >
          {busy ? 'Starting…' : 'Make photos'}
        </button>
        <span className="text-xs text-app-muted tabular-nums">
          {SHORT_PHOTO_MODELS[model].detail} · about {count} photos · {usd(Math.round(count * SHORT_PHOTO_MODELS[model].usdPerPhoto * 1e6))}
        </span>
      </div>
      {error && <p className="text-xs text-app-danger">{error}</p>}
    </section>
  );
}
