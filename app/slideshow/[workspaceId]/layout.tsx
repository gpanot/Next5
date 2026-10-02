import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { WorkspaceShell } from '../../../src/components/admin/autoSlideshow/workspace/WorkspaceShell';

/** Private Auto Slideshow page: kept out of search and AI indexes. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** One top bar for the workspace and its sub pages: moving between Calendar and Analytics only swaps the content. */
export default function PrivateSlideshowLayout({ children }: { children: ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
