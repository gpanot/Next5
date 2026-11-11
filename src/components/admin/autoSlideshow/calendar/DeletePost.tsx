'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';

type Props = {
  busy: boolean;
  onDelete: () => void;
};

/** Trash icon; a tap asks once more ("This post will be permanently deleted") before it deletes. */
export function DeletePost({ busy, onDelete }: Props) {
  const [asking, setAsking] = useState(false);
  if (!asking && !busy) {
    return (
      <button type="button" onClick={() => setAsking(true)} aria-label="Delete post" title="Delete post"
        className="ml-auto flex h-11 w-11 flex-none items-center justify-center rounded-full border border-[var(--line,#e8e5e1)] text-red-600 transition hover:bg-red-50 active:scale-95 dark:border-neutral-700 dark:text-red-400 dark:hover:bg-red-950">
        <Trash2 aria-hidden className="h-4 w-4" />
      </button>
    );
  }
  return (
    <div role="alertdialog" aria-label="Delete post" className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 transition dark:border-red-900 dark:bg-red-950">
      <p className="min-w-0 flex-1 text-[13px] font-semibold text-red-700 dark:text-red-300">This post will be permanently deleted.</p>
      <button type="button" onClick={() => setAsking(false)} disabled={busy}
        className="min-h-11 rounded-full px-4 text-[14px] font-semibold text-[var(--ink,#000)] transition hover:bg-white active:scale-95 disabled:opacity-40 dark:text-neutral-100 dark:hover:bg-neutral-900">
        Keep
      </button>
      <button type="button" onClick={onDelete} disabled={busy}
        className="flex min-h-11 items-center gap-1.5 rounded-full bg-red-600 px-4 text-[14px] font-semibold text-white shadow-sm transition hover:bg-red-700 active:scale-95 disabled:opacity-60">
        {busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />} Delete
      </button>
    </div>
  );
}
