import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import { WorkspaceShell } from '../../../../src/components/admin/autoSlideshow/workspace/WorkspaceShell';
import { WorkspaceShellSkeleton } from '../../../../src/components/admin/autoSlideshow/workspace/WorkspaceShellSkeleton';

/** Private Auto Slideshow page: kept out of search and AI indexes. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * One top bar for the workspace and its sub pages: moving between Calendar and Analytics only swaps the content.
 * The skeleton is the server HTML, so the page frame paints before any script runs.
 */
export default function PrivateSlideshowLayout({ children }: { children: ReactNode }) {
  return (
    // data-workspace switches on the soft workspace theme (globals.css); `contents` keeps it out of the layout.
    <div data-workspace className="contents">
      <Suspense fallback={<WorkspaceShellSkeleton />}>
        <WorkspaceShell>{children}</WorkspaceShell>
      </Suspense>
    </div>
  );
}
