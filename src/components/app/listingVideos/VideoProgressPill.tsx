'use client';

import { CheckCircle2, Loader2, X } from 'lucide-react';
import { AppLink } from '../shell/AppLink';
import { useWorkspace } from '../shell/WorkspaceProvider';
import { useActiveVideos } from './useActiveVideos';

const PILL = 'flex min-h-12 items-center gap-3 rounded-2xl border border-app-line bg-app-panel px-4 py-2.5 text-left shadow-md transition-colors duration-200 hover:bg-app-sunken';
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const doneLine = (ready: number, failed: number): string => {
  if (ready === 0) return failed === 1 ? 'A video could not be made' : `${failed} videos could not be made`;
  return `${plural(ready, 'video')} ready${failed > 0 ? ` · ${failed} failed` : ''}`;
};

/** Floats above the tab bar on every realtor page while listing videos are being made, then says when they are done. */
export const VideoProgressPill = () => {
  const { product } = useWorkspace();
  const { active, done, dismiss } = useActiveVideos(product === 'brand');
  if (active.length === 0 && !done) return null;

  const labels = [...new Set(active.map((v) => v.listingLabel))];
  const listingIds = [...new Set(active.map((v) => v.listingId))];
  return (
    <div className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex flex-col gap-2 sm:inset-x-auto sm:right-6 sm:w-80 lg:bottom-6" aria-live="polite">
      {active.length > 0 && (
        <AppLink href={listingIds.length === 1 ? `/app/create?listing=${listingIds[0]}` : '/app/library?view=videos'} className={PILL}>
          <Loader2 aria-hidden className="h-5 w-5 shrink-0 animate-spin text-app-muted" />
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold text-app-ink">Making {plural(active.length, 'video')}</span>
            <span className="block truncate text-[12px] text-app-muted">{labels.join(', ')} · about 2–3 min</span>
          </span>
        </AppLink>
      )}
      {done && (
        <div className="flex items-center gap-2">
          <AppLink href="/app/library?view=videos" onClick={dismiss} className={`${PILL} min-w-0 flex-1`}>
            <CheckCircle2 aria-hidden className={`h-5 w-5 shrink-0 ${done.ready > 0 ? 'text-app-accent' : 'text-app-danger'}`} />
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold text-app-ink">{doneLine(done.ready, done.failed)}</span>
              <span className="block text-[12px] text-app-muted">See them in your Library</span>
            </span>
          </AppLink>
          <button type="button" onClick={dismiss} aria-label="Dismiss" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-app-line bg-app-panel text-app-muted shadow-md transition-colors duration-200 hover:bg-app-sunken">
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};
