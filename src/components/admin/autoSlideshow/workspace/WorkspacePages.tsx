'use client';

import { usePathname } from 'next/navigation';
import { Activity, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { AnalyticsPage } from '../analytics/AnalyticsPage';
import { BrandPage } from '../brand/BrandPage';
import { ContentPage } from '../content/ContentPage';
import { WorkspaceApp } from './WorkspaceApp';
import { pageOf, type WorkspacePageId as PageId } from './workspaceNav';

const renderPage = (page: PageId, token: string, workspaceId: string): ReactNode => {
  if (page === 'analytics') return <AnalyticsPage token={token} workspaceId={workspaceId} />;
  if (page === 'content') return <ContentPage token={token} workspaceId={workspaceId} />;
  if (page === 'brand') return <BrandPage token={token} workspaceId={workspaceId} />;
  return <WorkspaceApp token={token} workspaceId={workspaceId} />;
};

/** Pauses audio and video when its page is hidden: hidden pages stay in the DOM, and media would keep playing. */
function PauseMediaWhenHidden({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = box.current;
    return () => el?.querySelectorAll<HTMLMediaElement>('audio, video').forEach((media) => media.pause());
  }, []);
  return <div ref={box}>{children}</div>;
}

/**
 * Calendar, Content, Brand and Analytics of one workspace. A page opened once stays mounted, hidden (React Activity) while
 * another shows, so going back is instant: same data, scroll, tabs and deck, no reload. Hidden pages stop their
 * effects (polling, timers) and resume them, refreshing in the background, when shown again.
 */
export function WorkspacePages({ token, workspaceId }: { token: string; workspaceId: string }) {
  const current = pageOf(usePathname());
  const [opened, setOpened] = useState<PageId[]>([current]);
  // Adjusting state while rendering (not in an effect) so the new page mounts in this same render.
  if (!opened.includes(current)) setOpened([...opened, current]);

  return (
    <>
      {opened.map((page) => (
        <Activity key={page} mode={page === current ? 'visible' : 'hidden'}>
          <PauseMediaWhenHidden>{renderPage(page, token, workspaceId)}</PauseMediaWhenHidden>
        </Activity>
      ))}
    </>
  );
}
