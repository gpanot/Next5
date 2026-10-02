'use client';

import { useParams } from 'next/navigation';
import { AnalyticsPage } from '../../../../src/components/admin/autoSlideshow/analytics/AnalyticsPage';
import { useWorkspaceToken } from '../../../../src/components/admin/autoSlideshow/workspace/WorkspaceShell';

/** One workspace's Analytics: its posted slideshows and how they perform. */
export default function SlideshowAnalyticsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  return <AnalyticsPage token={useWorkspaceToken()} workspaceId={workspaceId} />;
}
