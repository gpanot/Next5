'use client';

import { useRef, useState } from 'react';
import { copyViralMediaUrl, type CopyViralClip } from '../../../types/admin/copyViral';
import { secondsLabel } from './useCopyViral';

type Props = {
  token: string;
  projectId: string;
  clip: CopyViralClip | null;
  disabled: boolean;
  onUpload: (file: File) => Promise<unknown>;
  onRemove: () => Promise<unknown>;
  /** Opens the recorder (teleprompter + camera) on this shot. */
  onRecord: () => void;
};

/** Guillaume's take of one shot: upload, preview, retake, remove. Warnings show but never block. */
export function ClipSlot({ token, projectId, clip, disabled, onUpload, onRemove, onRecord }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const pick = (file: File | undefined) => {
    if (file) void run(() => onUpload(file));
    if (input.current) input.current.value = '';
  };

  return (
    <div className="w-36 shrink-0 space-y-1.5">
      {!clip && (
        <button type="button" onClick={onRecord} disabled={disabled || busy} className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-red-500 text-xs font-bold text-white transition hover:bg-red-400 disabled:opacity-40">
          <span className="h-2 w-2 rounded-full bg-white" /> Record
        </button>
      )}
      {clip ? (
        <video src={copyViralMediaUrl(token, projectId, clip.file)} controls playsInline preload="metadata" className="aspect-[9/16] w-full rounded-lg bg-black object-contain" />
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={disabled || busy}
          className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-app-line text-xs font-semibold text-app-muted transition hover:border-app-ink hover:text-app-ink disabled:opacity-40"
        >
          <span className="text-2xl leading-none">+</span>
          {busy ? 'Uploading…' : 'or upload my take'}
        </button>
      )}
      {clip && (
        <>
          <p className="text-[11px] text-app-muted">{secondsLabel(clip.durationMs)} · {clip.width}×{clip.height} · {Math.round(clip.fps)} fps</p>
          {clip.warnings.map((w) => <p key={w} className="text-[11px] leading-snug text-app-danger">{w}</p>)}
          <button type="button" onClick={onRecord} disabled={disabled || busy} className="min-h-8 w-full rounded-lg bg-red-500 text-xs font-bold text-white transition hover:bg-red-400 disabled:opacity-40">
            Record again
          </button>
          <div className="flex gap-1">
            <button type="button" onClick={() => input.current?.click()} disabled={disabled || busy} className="min-h-8 flex-1 rounded-lg border border-app-line text-xs font-semibold text-app-ink transition hover:bg-app-sunken disabled:opacity-40">
              {busy ? '…' : 'Upload'}
            </button>
            <button type="button" onClick={() => confirm('Remove this take?') && run(onRemove)} disabled={disabled || busy} className="min-h-8 rounded-lg px-2 text-xs font-semibold text-app-danger transition hover:bg-app-sunken disabled:opacity-40">
              Remove
            </button>
          </div>
        </>
      )}
      {error && <p className="text-[11px] text-app-danger">{error}</p>}
      <input ref={input} type="file" accept="video/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
