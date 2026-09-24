'use client';

/** The dashed upload box each clone input sits in. */

import { type ChangeEvent, type ReactNode } from 'react';
import { Spinner } from '../ugcLab/ui';

type Props = {
  title: string;
  subtitle: string;
  accept: string;
  busy: boolean;
  onFile: (file: File) => void;
  /** Shown instead of the picker once something has been uploaded. */
  children?: ReactNode;
};

export function DropZone({ title, subtitle, accept, busy, onFile, children }: Props) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border-2 border-dashed border-line bg-surface-alt p-5 text-center">
      <p className="text-[13px] font-medium text-ink">{title}</p>
      <p className="text-[12px] text-muted">{subtitle}</p>
      {children ?? (
        <label
          className={`mx-auto inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 ${busy ? 'pointer-events-none opacity-40' : ''}`}
        >
          {busy ? <><Spinner /> Uploading…</> : 'Choose file'}
          <input type="file" accept={accept} className="sr-only" disabled={busy} onChange={handleChange} />
        </label>
      )}
    </div>
  );
}

/** The "Replace" control shown under an uploaded preview. */
export function ReplaceButton({ accept, busy, onFile }: { accept: string; busy: boolean; onFile: (file: File) => void }) {
  return (
    <label
      className={`inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] text-ink transition-colors hover:bg-surface-alt ${busy ? 'pointer-events-none opacity-40' : ''}`}
    >
      {busy ? <><Spinner /> Uploading…</> : 'Replace'}
      <input
        type="file"
        accept={accept}
        className="sr-only"
        disabled={busy}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
      />
    </label>
  );
}
