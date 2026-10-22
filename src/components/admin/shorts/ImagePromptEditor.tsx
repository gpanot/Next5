'use client';

import { useState } from 'react';
import type { ShortBeatDto } from '../../../types/admin/shorts';
import { regenerateShot } from './useShorts';

/** The prompt sent to the image model, editable. "Regenerate" makes this shot's photo again from the edited text. */
export function ImagePromptEditor({ beat, shortId, token, disabled, onDone }: { beat: ShortBeatDto; shortId: string; token: string; disabled: boolean; onDone: () => void }) {
  const original = beat.imagePrompt ?? '';
  const [text, setText] = useState(original);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await regenerateShot(token, shortId, beat.idx, text);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not make the photo');
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="group rounded-lg bg-app-sunken px-3 py-2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-bold text-app-muted select-none group-open:mb-2">
        <span>
          <span className="mr-1 inline-block transition group-open:rotate-90">›</span>
          Image prompt (sent)
        </span>
      </summary>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        disabled={busy}
        aria-label={`Image prompt of shot ${beat.idx + 1}`}
        className="w-full rounded-lg border border-app-line bg-app-panel p-2 font-mono text-[11px] leading-relaxed text-app-ink focus:ring-2 focus:ring-app-ink/20 focus:outline-none disabled:opacity-50"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={run}
          disabled={busy || disabled || !text.trim()}
          className="min-h-11 rounded-lg bg-app-ink px-4 text-xs font-bold text-app-panel transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
        >
          {busy ? 'Making the photo…' : 'Regenerate'}
        </button>
        {text !== original && !busy && (
          <button type="button" onClick={() => setText(original)} className="min-h-11 px-2 text-xs font-semibold text-app-muted underline">
            Reset
          </button>
        )}
        {beat.clipUrl && <span className="text-[11px] text-app-muted">The clip of this shot is dropped; run the clips again to redo it.</span>}
      </div>
      {error && <p className="mt-2 text-xs text-app-danger">{error}</p>}
    </details>
  );
}
