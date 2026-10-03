'use client';

import { useParams } from 'next/navigation';
import { ContentPage } from '../../../../src/components/admin/autoSlideshow/content/ContentPage';
import { useWorkspaceToken } from '../../../../src/components/admin/autoSlideshow/workspace/WorkspaceShell';

/** One workspace's Content: Blitz Slide (the swipe deck) and more content tools later. */
export default function SlideshowContentPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  return <ContentPage token={useWorkspaceToken()} workspaceId={workspaceId} />;
}
