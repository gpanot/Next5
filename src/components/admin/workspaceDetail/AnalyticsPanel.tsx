'use client';

import { AnalyticsPage } from '../autoSlideshow/analytics/AnalyticsPage';
import { useUserSession } from './useImpersonation';
import { PanelEmpty, PanelError, PanelSkeleton } from './PanelStates';

/** The user's own Analytics page, loaded with a session as the workspace's owner, so the numbers match what they see. */
export function AnalyticsPanel({ token, workspaceId, product }: { token: string; workspaceId: string; product: string }) {
  if (product !== 'slideshow') return <PanelEmpty>Analytics exist for Auto Slideshow workspaces only.</PanelEmpty>;
  return <UserAnalytics token={token} workspaceId={workspaceId} />;
}

function UserAnalytics({ token, workspaceId }: { token: string; workspaceId: string }) {
  const { session, error } = useUserSession(token, workspaceId);
  if (error) return <PanelError message={error} />;
  if (!session) return <PanelSkeleton />;
  return <AnalyticsPage token={session.token} workspaceId={workspaceId} />;
}
