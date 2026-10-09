'use client';

import { usePathname } from 'next/navigation';
import { Activity, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { AnalyticsPage } from '../analytics/AnalyticsPage';
import { BrandPage } from '../brand/BrandPage';
import { ContentPage } from '../content/ContentPage';
import { CreditsPage } from '../settings/credits/CreditsPage';
import { WorkspaceApp } from './WorkspaceApp';
import { pageOf, type WorkspacePageId as PageId } from './workspaceNav';

/** Ideas and Calendar are two views of one mounted page: they share the ideas deck and the day plan it fills. */
type Slot = Exclude<PageId, 'ideas'>;
const slotOf = (page: PageId): Slot => (page === 'ideas' ? 'calendar' : page);

const renderPage = (page: Slot, token: string, workspaceId: string): ReactNode => {
  if (page === 'analytics') return <AnalyticsPage token={token} workspaceId={workspaceId} />;
  if (page === 'content') return <ContentPage token={token} workspaceId={workspaceId} />;
  if (page === 'brand') return <BrandPage token={token} workspaceId={workspaceId} />;
  if (page === 'credits') return <CreditsPage token={token} workspaceId={workspaceId} />;
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
 * Ideas and Calendar (one page, two views), Library, Brand, Analytics and Credits of one workspace. A page opened once stays mounted, hidden (React Activity) while
 * another shows, so going back is instant: same data, scroll, tabs and deck, no reload. Hidden pages stop their
 * effects (polling, timers) and resume them, refreshing in the background, when shown again.
 */
export function WorkspacePages({ token, workspaceId }: { token: string; workspaceId: string }) {
  const current = slotOf(pageOf(usePathname()));
  const [opened, setOpened] = useState<Slot[]>([current]);
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
