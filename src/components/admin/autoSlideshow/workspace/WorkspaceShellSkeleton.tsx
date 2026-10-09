import { BusinessLogo } from '../../../marketing/shared/MarketingHeader';
import { SLIDESHOW_HOME } from './WorkspaceContext';

/** Grey block where page content will be, sized like the Calendar's first card. */
export function WorkspaceContentSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-4" aria-busy="true" aria-label="Loading…">
      <div className="h-10 w-48 animate-pulse rounded-xl bg-app-sunken" />
      <div className="h-80 animate-pulse rounded-xl bg-app-sunken" />
    </div>
  );
}

/**
 * The workspace page before sign-in is known: same frame as WorkspaceShell (sidebar on wide screens; bottom tabs on
 * phones), then the content skeleton. In the server HTML too, so the frame paints at once and nothing
 * jumps when the real menu replaces it.
 */
export function WorkspaceShellSkeleton() {
  return (
    <div className="flex min-h-dvh bg-app-bg">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-app-line bg-app-bg px-4 py-6 lg:flex">
        <div className="px-2"><BusinessLogo href={SLIDESHOW_HOME} /></div>
        <div aria-hidden className="mt-10 flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => <span key={i} className="h-11 animate-pulse rounded-xl bg-app-line/40" />)}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-24 md:px-8 md:pt-8 lg:pb-8">
          <WorkspaceContentSkeleton />
        </main>
      </div>
      <div aria-hidden className="fixed inset-x-0 bottom-0 z-30 h-[calc(4rem+env(safe-area-inset-bottom))] border-t border-app-line bg-app-bg/95 lg:hidden" />
    </div>
  );
}
