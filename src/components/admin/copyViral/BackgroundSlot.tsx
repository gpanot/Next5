'use client';

import { useRef, useState } from 'react';
import { copyViralMediaUrl, type CopyViralShot } from '../../../types/admin/copyViral';
import { generateBackground, previousBackground, removeBackground, uploadBackground } from './useCopyViral';

type Props = { token: string; projectId: string; shot: CopyViralShot; disabled: boolean; onChange: () => void; previousHasPicture: boolean };

const btn = 'min-h-8 rounded-lg border border-app-line px-2.5 text-xs font-semibold text-app-ink transition hover:bg-app-sunken disabled:opacity-40';

/**
 * Green-screen look: a picture behind me for a whole sequence (the engine cuts me out). Shown when the reference has a
 * cut-out background there, or once I open it myself.
 */
export function BackgroundSlot({ token, projectId, shot, disabled, onChange, previousHasPicture }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(Boolean(shot.reading?.background || shot.background || shot.backgroundText));
  // the text the picture was last made from, else Gemini's description of the original's background, else its overlays
  const [description, setDescription] = useState(shot.backgroundText || shot.reading?.background || shot.reading?.overlays || '');
  const [busy, setBusy] = useState<'generate' | 'upload' | 'remove' | 'previous' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: 'generate' | 'upload' | 'remove' | 'previous', fn: () => Promise<unknown>) => {
    setBusy(kind);
    setError(null);
    try {
      await fn();
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  if (!open) {
    return <button type="button" className="text-xs font-semibold text-app-muted underline hover:text-app-ink" onClick={() => setOpen(true)}>+ Picture behind me (green screen)</button>;
  }

  const pick = (file: File | undefined) => {
    if (file) void run('upload', () => uploadBackground(token, projectId, shot.index, shot.startMs, file));
    if (input.current) input.current.value = '';
  };

  return (
    <div className="flex gap-3 rounded-lg bg-app-sunken p-2.5">
      <div className="aspect-[9/16] w-16 shrink-0 overflow-hidden rounded-md bg-app-line">
        {shot.background ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={copyViralMediaUrl(token, projectId, shot.background)} alt="Background" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center p-1 text-center text-[10px] text-app-muted">My room</span>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-[11px] font-bold tracking-wide text-app-muted uppercase">Picture behind me</p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Describe the place (no people)"
          className="w-full resize-y rounded-md border border-app-line bg-app-panel px-2 py-1 text-xs text-app-ink outline-none focus:border-app-ink"
        />
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={btn} disabled={disabled || busy !== null || !description.trim()} onClick={() => run('generate', () => generateBackground(token, projectId, shot.index, shot.startMs, description))}>
            {busy === 'generate' ? 'Making… (~30 s)' : shot.background ? 'New picture ($0.015)' : 'Make picture ($0.015)'}
          </button>
          {previousHasPicture && (
            <button type="button" className={btn} disabled={disabled || busy !== null} onClick={() => run('previous', () => previousBackground(token, projectId, shot.index, shot.startMs))}>
              Same as the sequence before
            </button>
          )}
          <button type="button" className={btn} disabled={disabled || busy !== null} onClick={() => input.current?.click()}>
            {busy === 'upload' ? 'Uploading…' : 'Upload mine'}
          </button>
          {shot.background && (
            <button type="button" className={`${btn} text-app-danger`} disabled={disabled || busy !== null} onClick={() => run('remove', () => removeBackground(token, projectId, shot.index, shot.startMs))}>
              Use my room
            </button>
          )}
        </div>
        {!description.trim() && <p className="text-[11px] text-app-muted">Describe the place to make a picture.</p>}
        {error && <p className="text-[11px] text-app-danger">{error}</p>}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
