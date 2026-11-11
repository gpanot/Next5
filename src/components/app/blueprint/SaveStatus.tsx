'use client';

import { SHELL } from './copy';
import type { SaveState } from './useAutosave';

/** Small save indicator for the page header. A failed save offers a retry; nothing is lost meanwhile. */
export const SaveStatus = ({ state, onRetry }: { state: SaveState; onRetry: () => void }) => {
  if (state === 'idle') return null;
  if (state === 'error') {
    return (
      <span role="status" className="flex items-center gap-1 text-[12px] text-app-danger">
        {SHELL.saveError}
        <button type="button" onClick={onRetry} className="min-h-11 px-1 font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent">
          {SHELL.retry}
        </button>
      </span>
    );
  }
  return (
    <span role="status" className="text-[12px] text-app-muted">
      {state === 'saving' ? SHELL.saving : SHELL.saved}
    </span>
  );
};
