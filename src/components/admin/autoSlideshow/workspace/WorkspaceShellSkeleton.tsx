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
 * The workspace page before sign-in is known: same top bar height and layout as AppTopBar, then the content skeleton.
 * In the server HTML too, so the page frame paints at once and nothing jumps when the real bar replaces it.
 */
export function WorkspaceShellSkeleton() {
  return (
    <div className="min-h-dvh bg-app-bg">
      <header className="sticky top-0 z-30 border-b border-app-line bg-app-bg/90 backdrop-blur-md">
        <div className="flex min-h-16 items-center gap-x-3 px-5 py-2 sm:gap-x-4 sm:px-8">
          <span className="hidden sm:block"><BusinessLogo href={SLIDESHOW_HOME} /></span>
          <span aria-hidden className="hidden h-10 w-32 animate-pulse rounded-full bg-app-line/60 sm:block" />
          <div aria-hidden className="ml-auto flex items-center gap-1 sm:gap-2">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-10 w-10 animate-pulse rounded-full bg-app-line/60 sm:w-24" />
            ))}
            <span className="h-10 w-28 animate-pulse rounded-full bg-app-line/60" />
            <span className="h-10 w-10 animate-pulse rounded-full bg-app-line/60" />
          </div>
        </div>
      </header>
      <main className="px-4 py-4 md:px-8 md:py-8">
        <WorkspaceContentSkeleton />
      </main>
    </div>
  );
}
