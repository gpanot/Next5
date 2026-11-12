'use client';

import { useState } from 'react';
import { genSeconds, SHORT_VIDEO_MODELS, isShortVideoModel, type ShortDetailDto, type VideoPromptMode } from '../../../types/admin/shorts';
import { redoClips, usd } from './useShorts';

/** Rough cost of making every clip again; null for a retired model. */
const estimate = (short: ShortDetailDto): number | null => {
  if (!isShortVideoModel(short.videoModel)) return null;
  const model = short.videoModel;
  return Math.round(short.beats.reduce((sum, b) => sum + genSeconds(model, b.spanS), 0) * SHORT_VIDEO_MODELS[model].usdPerSecond * 1e6);
};

/** Opened from the header's "Redo clips" button (ShortDetail): make all clips and the render again, keeping the script, voice and photos. */
export function RedoClipsPanel({ short, token, onStarted }: { short: ShortDetailDto; token: string; onStarted: () => void }) {
  const [mode, setMode] = useState<VideoPromptMode>('simple');
  const [rewrite, setRewrite] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cost = estimate(short);
  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      await redoClips(token, short.id, mode, rewrite);
      onStarted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the clips');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="space-y-3 rounded-xl border border-app-line bg-app-panel p-4 shadow-sm md:p-5">
      <div className="space-y-1">
        <h2 className="text-base font-extrabold text-app-ink">Redo the video clips</h2>
        <p className="text-sm text-app-muted">Script, voice and photos stay. Every clip is made again, then the video is rendered again.</p>
      </div>
      <fieldset className="space-y-1">
        <legend className="text-xs font-bold text-app-muted">Video prompt</legend>
        {(['simple', 'detailed'] as const).map((m) => (
          <label key={m} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-app-ink">
            <input type="radio" name="redoPromptMode" checked={mode === m} onChange={() => setMode(m)} className="h-4 w-4" />
            {m === 'simple' ? 'Motion only: what happens next, precisely' : 'Detailed: the photo prompt too, then the action'}
          </label>
        ))}
      </fieldset>
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-app-ink">
        <input type="checkbox" checked={rewrite} onChange={(e) => setRewrite(e.target.checked)} className="h-4 w-4" />
        Rewrite each shot’s motion with the new motion-only rules
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={go} disabled={busy} className="min-h-11 rounded-lg bg-app-ink px-4 text-sm font-bold text-app-panel transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40">
          {busy ? 'Starting…' : 'Redo all clips'}
        </button>
        <span className="text-xs text-app-muted tabular-nums">{short.beats.length} clips{cost !== null ? ` · about ${usd(cost)}` : ''}</span>
      </div>
      {error && <p className="text-xs text-app-danger">{error}</p>}
    </section>
  );
}
