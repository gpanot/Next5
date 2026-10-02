'use client';

import { useParams } from 'next/navigation';
import { WorkspaceApp } from '../../../src/components/admin/autoSlideshow/workspace/WorkspaceApp';
import { useWorkspaceToken } from '../../../src/components/admin/autoSlideshow/workspace/WorkspaceShell';

/** One Auto Slideshow workspace (one website): its Calendar. Make slideshows, connect its TikTok account, post. */
export default function SlideshowWorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  return <WorkspaceApp token={useWorkspaceToken()} workspaceId={workspaceId} />;
}
