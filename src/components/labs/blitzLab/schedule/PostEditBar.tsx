'use client';

import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  /** Back to where the video was opened (the Library or the calendar). Unsaved edits are dropped. */
  onBack: () => void;
  /** "Save changes". */
  actions: ReactNode;
};

/** Header above the editor when one calendar video is open on its own (`?editPost=`): one way back, one way to save. */
export function PostEditBar({ onBack, actions }: Props) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-app-line bg-app-panel px-3 py-2 shadow-sm transition-colors">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-app-muted transition hover:bg-app-sunken hover:text-app-ink active:scale-95"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" /> Back
      </button>
      <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-app-ink">Edit video</h1>
      {actions}
    </div>
  );
}
