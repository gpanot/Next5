'use client';

import { Check, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import type { IdeaDto } from '../../../../types/admin/calendarIdeas';

type Props = { idea: IdeaDto; onPick: (hookId: string) => Promise<void>; onClose: () => void };

/** "Pick the first line": same idea, another hook. A bottom sheet on phones, a dialog on wider screens. */
export function HookPicker({ idea, onPick, onClose }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const pick = async (id: string) => {
    setBusy(id);
    await onPick(id);
    setBusy(null);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Pick the first line" onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-3 rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl dark:bg-zinc-950">
        <header className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="text-base font-extrabold text-ink dark:text-zinc-100">Pick the first line</h3>
            <p className="text-sm text-muted">{idea.format === 'blitz' ? 'Same story. Different hook.' : 'Same slides. Different hook.'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X aria-hidden className="h-5 w-5" />
          </button>
        </header>
        <ul className="space-y-2">
          <li className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-blue-600 px-3 py-2 text-sm font-semibold text-ink dark:text-zinc-100">
            <Check aria-hidden className="h-4 w-4 shrink-0 text-blue-600" /> {idea.hook}
          </li>
          {idea.hooks.filter((h) => h.text !== idea.hook).map((h) => (
            <li key={h.id}>
              <button type="button" onClick={() => void pick(h.id)} disabled={busy !== null} className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-line px-3 py-2 text-left text-sm text-ink transition hover:border-blue-300 hover:bg-blue-50 active:scale-[0.98] disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-blue-950">
                {busy === h.id && <Loader2 aria-hidden className="h-4 w-4 shrink-0 animate-spin" />}
                {h.text}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
