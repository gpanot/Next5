'use client';

import { useParams } from 'next/navigation';
import { UserGate } from '../../../src/components/admin/autoSlideshow/UserGate';
import { WorkspaceApp } from '../../../src/components/admin/autoSlideshow/workspace/WorkspaceApp';

/** One Auto Slideshow workspace (one website): make slideshows, connect its TikTok account, post. */
export default function SlideshowWorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  return <UserGate>{(token) => <WorkspaceApp token={token} workspaceId={workspaceId} />}</UserGate>;
}
